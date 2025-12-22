import { useState, useEffect, useRef, useCallback } from "react";
import { getValidAccessToken, getCurrentUser } from "@/lib/spotify";
import type { SpotifyPlayer, SpotifyWebPlaybackState } from "@/types/spotify";

interface UseSpotifyPlayerOptions {
    enabled: boolean;
}

export function useSpotifyPlayer({ enabled }: UseSpotifyPlayerOptions) {
    const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [currentTrack, setCurrentTrack] = useState<any | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const playerRef = useRef<SpotifyPlayer | null>(null);
    const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load Spotify Web Playback SDK script
    useEffect(() => {
        if (!enabled) return;

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
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        };
    }, [enabled]);

    const initializePlayer = async () => {
        const token = await getValidAccessToken();
        if (!token || !window.Spotify) return;

        // Check subscription status
        try {
            const user = await getCurrentUser();
            if (user.product !== 'premium') {
                console.log('Free Spotify account detected');
                setError('Free Spotify account detected. Premium required for in-browser playback.');
                // Don't initialize player for free users to avoid errors
                return;
            }
        } catch (e) {
            console.error("Failed to check subscription", e);
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
            setDeviceId(device_id);
            setIsReady(true);
            setError(null);
        });

        // Not Ready
        spotifyPlayer.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
            setIsReady(false);
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

            // Update position while playing
            if (!state.paused) {
                startPositionUpdate();
            } else {
                stopPositionUpdate();
            }
        });

        // Connect to the player
        spotifyPlayer.connect();

        playerRef.current = spotifyPlayer;
        setPlayer(spotifyPlayer);
    };

    // Start updating position
    const startPositionUpdate = () => {
        if (positionIntervalRef.current) return;

        positionIntervalRef.current = setInterval(() => {
            setPosition((prev) => Math.min(prev + 1000, duration));
        }, 1000);
    };

    // Stop updating position
    const stopPositionUpdate = () => {
        if (positionIntervalRef.current) {
            clearInterval(positionIntervalRef.current);
            positionIntervalRef.current = null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPositionUpdate();
            if (playerRef.current) {
                playerRef.current.disconnect();
            }
        };
    }, []);

    // Control functions
    const togglePlay = useCallback(async () => {
        if (!player) return;
        await player.togglePlay();
    }, [player]);

    const next = useCallback(async () => {
        if (!player) return;
        await player.nextTrack();
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
    };
}
