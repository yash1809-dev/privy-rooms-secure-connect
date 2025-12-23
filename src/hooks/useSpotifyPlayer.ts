import { useState, useEffect, useRef, useCallback } from "react";
import { getValidAccessToken, getCurrentUser, getPlaybackState } from "@/lib/spotify";
import type { SpotifyPlayer, SpotifyWebPlaybackState } from "@/types/spotify";

interface UseSpotifyPlayerOptions {
    enabled: boolean;
}

// Module-level state - persists across component remounts
let globalPlayer: SpotifyPlayer | null = null;
let globalDeviceId: string | null = null;
let globalIsReady: boolean = false;
let globalIsInitializing: boolean = false;

export function useSpotifyPlayer({ enabled }: UseSpotifyPlayerOptions) {
    // Use global state as initial values, sync back on changes
    const [player, setPlayer] = useState<SpotifyPlayer | null>(globalPlayer);
    const [deviceId, setDeviceId] = useState<string | null>(globalDeviceId);
    const [isReady, setIsReady] = useState(globalIsReady);
    const [isPaused, setIsPaused] = useState(true);
    const [currentTrack, setCurrentTrack] = useState<any | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const durationRef = useRef<number>(0);

    // Load Spotify Web Playback SDK script
    useEffect(() => {
        if (!enabled) return;

        // If player already exists and is connected, reuse it
        if (globalPlayer) {
            console.log('Reusing existing Spotify player - already connected');
            setPlayer(globalPlayer);
            setDeviceId(globalDeviceId);
            setIsReady(globalIsReady);

            // Don't call connect() - player is already connected
            // Calling connect() can trigger disconnect/reconnect cycle

            // Restore playback state from the existing player
            globalPlayer.getCurrentState().then((state) => {
                if (state) {
                    setIsPaused(state.paused);
                    setCurrentTrack(state.track_window.current_track);
                    setPosition(state.position);
                    setDuration(state.duration);
                    durationRef.current = state.duration;

                    // Resume position updates if playing
                    if (!state.paused) {
                        startPositionUpdate();
                    }
                }
            });

            return;
        }

        // Prevent multiple simultaneous initializations
        if (globalIsInitializing) return;

        // Check if script is already loaded
        if (window.Spotify) {
            initializePlayer();
            return;
        }

        // Load script
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            initializePlayer();
        };

        return () => {
            // Don't remove script or disconnect player - keep it alive for reuse
            // Only clean up intervals
            stopPositionUpdate();
        };
    }, [enabled]);

    const initializePlayer = async () => {
        // Prevent duplicate initialization
        if (globalIsInitializing || globalPlayer) {
            console.log('Player already initializing or exists, skipping...');
            return;
        }

        globalIsInitializing = true;

        const token = await getValidAccessToken();
        if (!token || !window.Spotify) {
            globalIsInitializing = false;
            return;
        }

        // Check subscription status
        try {
            const user = await getCurrentUser();

            // Log the full response for debugging
            console.log('Spotify user info:', {
                display_name: user.display_name,
                email: user.email,
                product: user.product,
                id: user.id
            });

            if (user.product !== 'premium') {
                console.warn(`Non-premium account detected: product="${user.product}"`);
                setError('Free Spotify account detected. Premium required for in-browser playback.');
                globalIsInitializing = false;
                return; // Don't initialize player
            }

            console.log('✅ Premium account confirmed, initializing player...');
        } catch (e) {
            console.error("Failed to check subscription - BLOCKING player initialization:", e);
            setError('Unable to verify Spotify subscription. Please disconnect and reconnect.');
            globalIsInitializing = false;
            return; // CRITICAL: Don't proceed if we can't verify
        }

        const spotifyPlayer = new window.Spotify.Player({
            name: 'CollegeOS Focus Sanctuary',
            getOAuthToken: async (cb) => {
                const accessToken = await getValidAccessToken();
                if (accessToken) cb(accessToken);
            },
            volume: 0.5,
        });

        // Ready
        spotifyPlayer.addListener('ready', ({ device_id }) => {
            console.log('Spotify Player Ready with Device ID', device_id);
            // Updating local state
            setDeviceId(device_id);
            setIsReady(true);
            setError(null);

            // Updating global persistence
            globalDeviceId = device_id;
            globalIsReady = true;
        });

        // Not Ready
        spotifyPlayer.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
            setIsReady(false);
            globalIsReady = false;
        });

        // Errors
        spotifyPlayer.addListener('initialization_error', ({ message }) => {
            console.error('Failed to initialize:', message);
            setError(message);
        });

        spotifyPlayer.addListener('authentication_error', ({ message }) => {
            console.error('Failed to authenticate:', message);
            setError(message);
        });

        spotifyPlayer.addListener('account_error', ({ message }) => {
            console.error('Failed to validate Spotify account:', message);
            setError('Free Spotify account detected. Premium required for in-browser playback.');
        });

        // Player state changed
        spotifyPlayer.addListener('player_state_changed', (state: SpotifyWebPlaybackState | null) => {
            if (!state) {
                setCurrentTrack(null);
                setIsPaused(true);
                return;
            }

            setIsPaused(state.paused);
            setCurrentTrack(state.track_window.current_track);
            setPosition(state.position);
            setDuration(state.duration);
            durationRef.current = state.duration; // Keep ref in sync

            // Update position while playing
            if (!state.paused) {
                startPositionUpdate();
            } else {
                stopPositionUpdate();
            }
        });

        // Connect to the player
        spotifyPlayer.connect();

        // Update local and global state
        globalPlayer = spotifyPlayer;
        setPlayer(spotifyPlayer);
        globalIsInitializing = false; // Reset flag after successful initialization
    };

    // Start updating position
    const startPositionUpdate = () => {
        if (positionIntervalRef.current) return;

        positionIntervalRef.current = setInterval(() => {
            setPosition((prev) => {
                const newPos = prev + 1000;
                // Use ref to get current duration (avoids closure issue)
                return newPos < durationRef.current ? newPos : durationRef.current;
            });
        }, 1000);
    };

    // Stop updating position
    const stopPositionUpdate = () => {
        if (positionIntervalRef.current) {
            clearInterval(positionIntervalRef.current);
            positionIntervalRef.current = null;
        }
    };

    // Poll for playback state (Read-Only Mode for Free users / Remote play)
    useEffect(() => {
        if (!enabled) return;

        const pollState = async () => {
            try {
                const state = await getPlaybackState();

                // If we found an active state
                if (state && state.item) {
                    // If playing on ANOTHER device, or we are in error mode (Free tier), update UI
                    // Note: We prioritize SDK state if it's active and playing on THIS device
                    if (error || (state.device?.id !== deviceId)) {
                        setCurrentTrack(state.item);
                        setIsPaused(state.is_playing === false);
                        setDuration(state.item.duration_ms);
                        setPosition(state.progress_ms);
                    }
                } else if (!isReady && !error) {
                    // Nothing playing and not ready
                    setCurrentTrack(null);
                }
            } catch (e) {
                // Ignore polling errors
            }
        };

        const interval = setInterval(pollState, 5000);
        pollState(); // Initial run

        return () => clearInterval(interval);
    }, [enabled, deviceId, isReady, error]);

    // Cleanup on unmount - but keep player alive for reuse
    useEffect(() => {
        return () => {
            stopPositionUpdate();
            // Don't disconnect player - it will be reused when component remounts
        };
    }, []);

    // Control functions
    const togglePlay = useCallback(async () => {
        if (player) {
            await player.togglePlay();
        }
    }, [player]);

    const next = useCallback(async () => {
        if (player) {
            await player.nextTrack();
        }
    }, [player]);

    const previous = useCallback(async () => {
        if (!player) return;
        await player.previousTrack();
    }, [player]);

    const seek = useCallback(async (positionMs: number) => {
        if (!player) return;
        await player.seek(positionMs);
        setPosition(positionMs);
    }, [player]);

    const setVolume = useCallback(async (volume: number) => {
        if (!player) return;
        await player.setVolume(volume);
    }, [player]);

    // Explicit disconnect function for when user disconnects Spotify
    const disconnect = useCallback(() => {
        if (globalPlayer) {
            console.log('Explicitly disconnecting Spotify player');
            globalPlayer.disconnect();
            globalPlayer = null;
        }

        // Reset persisted globals
        globalDeviceId = null;
        globalIsReady = false;
        globalIsInitializing = false;

        // Reset local state
        setPlayer(null);
        setDeviceId(null);
        setIsReady(false);
        setCurrentTrack(null);
        setError(null);
    }, []);

    return {
        player,
        deviceId,
        isReady,
        isPaused,
        currentTrack,
        position,
        duration,
        togglePlay,
        next,
        previous,
        seek,
        setVolume,
        error,
        disconnect, // Expose disconnect for explicit cleanup
    };
}
