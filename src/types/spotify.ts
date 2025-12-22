// Spotify authentication tokens
export interface SpotifyTokens {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    token_type?: string;
    scope?: string;
}

// Spotify user profile
export interface SpotifyUser {
    id: string;
    display_name: string;
    email?: string;
    images?: Array<{ url: string }>;
}

// Spotify playlist
export interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string;
    images: Array<{ url: string }>;
    tracks: {
        total: number;
        href: string;
    };
    owner: {
        display_name: string;
    };
}

// Spotify track
export interface SpotifyTrack {
    id: string;
    name: string;
    artists: Array<{
        name: string;
        id: string;
    }>;
    album: {
        name: string;
        images: Array<{ url: string }>;
    };
    duration_ms: number;
    uri: string;
}

// Spotify playback state
export interface SpotifyPlaybackState {
    is_playing: boolean;
    progress_ms: number;
    item: SpotifyTrack | null;
    device: {
        id: string;
        name: string;
        type: string;
        volume_percent: number;
    } | null;
    shuffle_state: boolean;
    repeat_state: 'off' | 'track' | 'context';
}

// Spotify player device
export interface SpotifyDevice {
    id: string;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    type: string;
    volume_percent: number;
}

// Spotify Web Playback SDK Player
export interface SpotifyPlayer {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    addListener: (event: string, callback: (state: any) => void) => boolean;
    removeListener: (event: string) => boolean;
    getCurrentState: () => Promise<SpotifyWebPlaybackState | null>;
    setName: (name: string) => Promise<void>;
    getVolume: () => Promise<number>;
    setVolume: (volume: number) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    togglePlay: () => Promise<void>;
    seek: (position_ms: number) => Promise<void>;
    previousTrack: () => Promise<void>;
    nextTrack: () => Promise<void>;
    activateElement: () => Promise<void>;
}

// Spotify Web Playback SDK State
export interface SpotifyWebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
        current_track: {
            id: string;
            name: string;
            artists: Array<{ name: string }>;
            album: {
                name: string;
                images: Array<{ url: string }>;
            };
            uri: string;
            duration_ms: number;
        };
        previous_tracks: any[];
        next_tracks: any[];
    };
}

// Window types for Spotify SDK
declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady?: () => void;
        Spotify?: {
            Player: new (options: {
                name: string;
                getOAuthToken: (cb: (token: string) => void) => void;
                volume?: number;
            }) => SpotifyPlayer;
        };
    }
}
