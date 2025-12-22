import { Button } from "@/components/ui/button";
import { Music, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyConnectButtonProps {
    isConnected: boolean;
    isLoading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    className?: string;
}

export function SpotifyConnectButton({
    isConnected,
    isLoading,
    onConnect,
    onDisconnect,
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
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                        Spotify Connected
                    </span>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onDisconnect}
                    className="h-9 w-9 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                >
                    <LogOut className="w-4 h-4" />
                </Button>
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
