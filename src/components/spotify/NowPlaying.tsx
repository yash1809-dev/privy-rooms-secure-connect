import { cn } from "@/lib/utils";

interface NowPlayingProps {
    track: {
        name: string;
        artists: Array<{ name: string }>;
        album: {
            images: Array<{ url: string }>;
        };
    } | null;
    isPlaying: boolean;
    className?: string;
}

export function NowPlaying({ track, isPlaying, className }: NowPlayingProps) {
    if (!track) {
        return (
            <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10", className)}>
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">No track playing</p>
                </div>
            </div>
        );
    }

    const albumArt = track.album.images[0]?.url;
    const artistNames = track.artists.map(a => a.name).join(", ");

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-500/20 backdrop-blur-sm transition-all",
            isPlaying && "shadow-[0_0_20px_rgba(20,184,166,0.2)]",
            className
        )}>
            <div className="relative">
                {albumArt ? (
                    <img
                        src={albumArt}
                        alt="Album art"
                        className="w-12 h-12 rounded-lg object-cover shadow-lg"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                    </div>
                )}
                {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]">
                        <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight">
                    {track.name}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                    {artistNames}
                </p>
            </div>
            {isPlaying && (
                <div className="flex gap-0.5 items-end h-4">
                    {[0.4, 0.7, 0.5, 0.9].map((height, i) => (
                        <div
                            key={i}
                            className="w-1 bg-teal-500 rounded-full animate-bounce"
                            style={{
                                height: `${height * 100}%`,
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '0.6s'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
