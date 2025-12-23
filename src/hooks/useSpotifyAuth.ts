import { useState, useEffect } from "react";
import {
    getSpotifyAuthUrl,
    getTokensFromDatabase,
    deleteTokensFromDatabase,
    getValidAccessToken,
    getCurrentUser
} from "@/lib/spotify";
import type { SpotifyTokens } from "@/types/spotify";

export function useSpotifyAuth() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
    const [userInfo, setUserInfo] = useState<{ display_name: string; email?: string; product: string } | null>(null);

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

                    // Fetch user info to show which account is connected
                    try {
                        const user = await getCurrentUser();
                        setUserInfo({
                            display_name: user.display_name || 'Unknown User',
                            email: user.email,
                            product: user.product
                        });
                        console.log('Connected Spotify account:', user.display_name, `(${user.product})`);
                    } catch (e) {
                        console.error('Failed to fetch Spotify user info:', e);
                        setUserInfo(null);
                    }
                } else {
                    setIsConnected(false);
                    setTokens(null);
                    setUserInfo(null);
                }
            } else {
                setIsConnected(false);
                setTokens(null);
                setUserInfo(null);
            }
        } catch (error) {
            console.error("Error checking Spotify connection:", error);
            setIsConnected(false);
            setTokens(null);
            setUserInfo(null);
        } finally {
            setIsLoading(false);
        }
    };

    const connect = async () => {
        try {
            const authUrl = await getSpotifyAuthUrl();
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
            setUserInfo(null);
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
        userInfo,
        connect,
        disconnect,
        refreshConnection,
    };
}
