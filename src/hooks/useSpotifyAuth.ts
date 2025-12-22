import { useState, useEffect } from "react";
import {
    getSpotifyAuthUrl,
    getTokensFromDatabase,
    deleteTokensFromDatabase,
    getValidAccessToken
} from "@/lib/spotify";
import type { SpotifyTokens } from "@/types/spotify";

export function useSpotifyAuth() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);

    // Check if user is connected on mount
    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setIsLoading(true);
        try {
            const storedTokens = await getTokensFromDatabase();
            if (storedTokens) {
                // Verify token is valid
                const accessToken = await getValidAccessToken();
                if (accessToken) {
                    setTokens(storedTokens);
                    setIsConnected(true);
                } else {
                    setIsConnected(false);
                    setTokens(null);
                }
            } else {
                setIsConnected(false);
                setTokens(null);
            }
        } catch (error) {
            console.error("Error checking Spotify connection:", error);
            setIsConnected(false);
            setTokens(null);
        } finally {
            setIsLoading(false);
        }
    };

    const connect = () => {
        try {
            const authUrl = getSpotifyAuthUrl();
            window.location.href = authUrl;
        } catch (error) {
            console.error("Error initiating Spotify auth:", error);
            throw error;
        }
    };

    const disconnect = async () => {
        try {
            await deleteTokensFromDatabase();
            setIsConnected(false);
            setTokens(null);
        } catch (error) {
            console.error("Error disconnecting Spotify:", error);
            throw error;
        }
    };

    const refreshConnection = async () => {
        await checkConnection();
    };

    return {
        isConnected,
        isLoading,
        tokens,
        connect,
        disconnect,
        refreshConnection,
    };
}
