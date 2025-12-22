import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SpotifyPlayerProps {
    isPaused: boolean;
    position: number;
    duration: number;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (position: number) => void;
    onVolumeChange: (volume: number) => void;
    className?: string;
}

export function SpotifyPlayer({
    isPaused,
    position,
    duration,
    onTogglePlay,
    onNext,
    onPrevious,
    onSeek,
    onVolumeChange,
    className,
}: SpotifyPlayerProps) {
    const [volume, setVolume] = useState(50);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        onVolumeChange(newVolume / 100);
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Progress Bar */}
            <div className="space-y-2">
                <Slider
                    value={[progressPercent]}
                    max={100}
                    step={0.1}
                    onValueChange={(value) => {
                        const newPosition = (value[0] / 100) * duration;
                        onSeek(newPosition);
                    }}
                    className="cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onPrevious}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                    size="icon"
                    onClick={onTogglePlay}
                    className={cn(
                        "h-12 w-12 rounded-full shadow-lg transition-all",
                        !isPaused && "shadow-[0_0_20px_rgba(20,184,166,0.5)] scale-105"
                    )}
                >
                    {isPaused ? (
                        <Play className="w-5 h-5 ml-0.5" />
                    ) : (
                        <Pause className="w-5 h-5" />
                    )}
                </Button>

                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onNext}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <SkipForward className="w-4 h-4" />
                </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 px-2">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                />
                <span className="text-xs font-mono text-slate-500 w-8 text-right">
                    {volume}%
                </span>
            </div>
        </div>
    );
}
