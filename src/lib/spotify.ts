import { supabase } from "@/integrations/supabase/client";
import type { SpotifyTokens, SpotifyUser } from "@/types/spotify";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com";

// Get Spotify config from environment
export const getSpotifyConfig = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        throw new Error("Spotify configuration missing. Please add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI to your .env file");
    }

    return { clientId, redirectUri };
};

// Generate random string for OAuth state
export const generateRandomString = (length: number): string => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

// Generate PKCE code challenge
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

// Get Spotify authorization URL
export const getSpotifyAuthUrl = async (): Promise<string> => {
    const { clientId, redirectUri } = getSpotifyConfig();
    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(128); // PKCE requirement: 43-128 chars
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state & verifier for verification
    sessionStorage.setItem('spotify_auth_state', state);
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const scope = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-read-collaborative',
        'streaming',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
    ].join(' ');

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope,
        redirect_uri: redirectUri,
        state,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    });

    return `${SPOTIFY_ACCOUNTS_BASE}/authorize?${params.toString()}`;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code: string): Promise<SpotifyTokens> => {
    const { clientId, redirectUri } = getSpotifyConfig();
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');

    if (!codeVerifier) {
        throw new Error("PKCE code verifier missing");
    }

    const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier, // PKCE Check
        }),
    });

    // Clear verifier after use
    sessionStorage.removeItem('spotify_code_verifier');

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to exchange code: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        token_type: data.token_type,
        scope: data.scope,
    };
};

// Save tokens to Supabase
export const saveTokensToDatabase = async (tokens: SpotifyTokens): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('spotify_tokens')
        .upsert({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
        });

    if (error) throw error;
};

// Get tokens from database
export const getTokensFromDatabase = async (): Promise<SpotifyTokens | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('spotify_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !data) return null;

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
    };
};

// Check if token is expired
export const isTokenExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) <= new Date();
};

// Refresh access token
export const refreshAccessToken = async (refreshToken: string): Promise<SpotifyTokens> => {
    const { clientId } = getSpotifyConfig();

    const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Use old refresh token if new one not provided
        expires_at: expiresAt,
    };
};

// Get valid access token (refresh if needed)
export const getValidAccessToken = async (): Promise<string | null> => {
    let tokens = await getTokensFromDatabase();
    if (!tokens) return null;

    // If token is expired, refresh it
    if (isTokenExpired(tokens.expires_at)) {
        try {
            tokens = await refreshAccessToken(tokens.refresh_token);
            await saveTokensToDatabase(tokens);
        } catch (error) {
            console.error('Failed to refresh token:', error);
            // Delete invalid tokens
            await deleteTokensFromDatabase();
            return null;
        }
    }

    return tokens.access_token;
};

// Delete tokens from database (disconnect)
export const deleteTokensFromDatabase = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('spotify_tokens')
        .delete()
        .eq('user_id', user.id);
};

// Make authenticated Spotify API request
export const spotifyApiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
        throw new Error("No valid Spotify access token");
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Spotify API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
};

export const getCurrentUser = async (): Promise<SpotifyUser & { product: string }> => {
    return spotifyApiRequest('/me');
};

// Playback control functions
export const play = async (deviceId?: string, contextUri?: string, uris?: string[]) => {
    const params = deviceId ? `?device_id=${deviceId}` : '';
    const body: any = {};

    if (contextUri) body.context_uri = contextUri;
    if (uris) body.uris = uris;

    await spotifyApiRequest('/me/player/play' + params, {
        method: 'PUT',
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
};

export const pause = async (deviceId?: string) => {
    const params = deviceId ? `?device_id=${deviceId}` : '';
    await spotifyApiRequest('/me/player/pause' + params, {
        method: 'PUT',
    });
};

export const nextTrack = async (deviceId?: string) => {
    const params = deviceId ? `?device_id=${deviceId}` : '';
    await spotifyApiRequest('/me/player/next' + params, {
        method: 'POST',
    });
};

export const previousTrack = async (deviceId?: string) => {
    const params = deviceId ? `?device_id=${deviceId}` : '';
    await spotifyApiRequest('/me/player/previous' + params, {
        method: 'POST',
    });
};

export const setVolume = async (volumePercent: number, deviceId?: string) => {
    const params = new URLSearchParams({ volume_percent: volumePercent.toString() });
    if (deviceId) params.append('device_id', deviceId);

    await spotifyApiRequest(`/me/player/volume?${params.toString()}`, {
        method: 'PUT',
    });
};
