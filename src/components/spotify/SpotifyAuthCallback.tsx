import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens, saveTokensToDatabase } from "@/lib/spotify";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpotifyAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const storedState = sessionStorage.getItem('spotify_auth_state');

            if (!code) {
                throw new Error('No authorization code received');
            }

            if (state !== storedState) {
                throw new Error('State mismatch - possible CSRF attack');
            }

            // Exchange code for tokens
            const tokens = await exchangeCodeForTokens(code);

            // Save to database
            await saveTokensToDatabase(tokens);

            // Clean up
            sessionStorage.removeItem('spotify_auth_state');

            setStatus('success');

            // Redirect back to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Spotify auth callback error:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect Spotify');
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="max-w-md w-full glass-card p-8 text-center space-y-6 border-teal-500/20 bg-slate-900/40 backdrop-blur-xl">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-teal-400 animate-spin mx-auto" />
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connecting Spotify</h2>
                            <p className="text-sm text-slate-400">Please wait while we set up your connection...</p>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-teal-400 mx-auto" />
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h2>
                            <p className="text-sm text-slate-400">Redirecting you back to the dashboard...</p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                            <p className="text-sm text-slate-400 mb-4">{error}</p>
                            <Button
                                onClick={() => navigate('/dashboard')}
                                variant="outline"
                                className="bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20"
                            >
                                Return to Dashboard
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
