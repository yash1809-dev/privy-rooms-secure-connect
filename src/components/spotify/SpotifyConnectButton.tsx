import { Button } from "@/components/ui/button";
import { Music, LogOut, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyConnectButtonProps {
    isConnected: boolean;
    isLoading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    userInfo?: { display_name: string; email?: string; product: string } | null;
    className?: string;
}

export function SpotifyConnectButton({
    isConnected,
    isLoading,
    onConnect,
    onDisconnect,
    userInfo,
    className,
}: SpotifyConnectButtonProps) {
    if (isLoading) {
        return (
            <Button
                disabled
                variant="outline"
                className={cn(
                    "w-full bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20",
                    className
                )}
            >
                <Music className="w-4 h-4 mr-2 animate-pulse" />
                Connecting...
            </Button>
        );
    }

    if (isConnected) {
        const isPremium = userInfo?.product === 'premium';

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border",
                        isPremium
                            ? "bg-teal-500/10 border-teal-500/20"
                            : "bg-amber-500/10 border-amber-500/20"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            isPremium ? "bg-teal-500" : "bg-amber-500"
                        )} />
                        <div className="flex-1 min-w-0">
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider block truncate",
                                isPremium ? "text-teal-400" : "text-amber-400"
                            )}>
                                {userInfo?.display_name || 'Spotify Connected'}
                            </span>
                            {userInfo && (
                                <span className="text-[10px] text-slate-500 block">
                                    {userInfo.product} {userInfo.email && `• ${userInfo.email}`}
                                </span>
                            )}
                        </div>
                        {!isPremium && (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onDisconnect}
                        className="h-9 w-9 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        title="Disconnect Spotify"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
                {!isPremium && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/10">
                        <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <p className="text-[10px] text-amber-200/80">
                            Free account detected. Try reconnecting if you have Premium.
                        </p>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                                await onDisconnect();
                                setTimeout(onConnect, 500);
                            }}
                            className="h-6 px-2 text-[10px] text-amber-300 hover:text-amber-100 hover:bg-amber-500/10 ml-auto"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reconnect
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Button
            onClick={onConnect}
            variant="outline"
            className={cn(
                "w-full bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20 hover:border-teal-500/40 transition-all group",
                className
            )}
        >
            <Music className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            Connect Spotify
        </Button>
    );
}
