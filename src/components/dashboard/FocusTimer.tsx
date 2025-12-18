
import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FocusTimerProps {
    onSessionComplete: (minutes: number) => void;
    // New props for real-time updates
    setMinutesFocused?: React.Dispatch<React.SetStateAction<number>>;
    onTick?: (timeLeft: number) => void;
    onStatusChange?: (isActive: boolean) => void;
}

const PRESETS = [
    { label: "Deep Work", duration: 45 * 60 },
    { label: "Coding", duration: 60 * 60 },
    { label: "Reading", duration: 30 * 60 },
    { label: "Meditation", duration: 10 * 60 },
];

export function FocusTimer({ onSessionComplete, setMinutesFocused, onTick, onStatusChange }: FocusTimerProps) {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [initialTime, setInitialTime] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [sessionName, setSessionName] = useState("Focus Session");
    const [customMinutes, setCustomMinutes] = useState("25");

    // Track seconds focused in THIS specific session for real-time updates
    const secondsFocusedRef = useRef(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    const newVal = prev - 1;
                    if (onTick) onTick(newVal);
                    return newVal;
                });

                // Every second, increment our local tracker
                secondsFocusedRef.current += 1;

                // If we hit a minute (60s), update the global plant growth
                if (secondsFocusedRef.current % 60 === 0 && setMinutesFocused) {
                    setMinutesFocused(prev => prev + 1);
                }

            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            // Timer finished
            handleComplete();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, setMinutesFocused, onTick]);

    const handleComplete = () => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // Calculate minutes completed
        const minutes = Math.floor(initialTime / 60);
        onSessionComplete(minutes);

        toast.success(`🎉 ${sessionName} complete! +${minutes}m focus time.`);

        // Play sound? (Optional, skipping for now)
        setTimeLeft(initialTime);
    };

    const toggleTimer = () => {
        const nextState = !isActive;
        setIsActive(nextState);
        onStatusChange?.(nextState);
    };

    const resetTimer = () => {
        setIsActive(false);
        onStatusChange?.(false);
        setTimeLeft(initialTime);
    };

    const setPreset = (duration: number, label: string) => {
        setIsActive(false);
        setInitialTime(duration);
        setTimeLeft(duration);
        setSessionName(label);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = ((initialTime - timeLeft) / initialTime) * 100;

    return (
        <div className="flex flex-col items-center space-y-8 w-full max-w-md mx-auto">
            {/* Timer Display */}
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
                {/* Semi-transparent backdrop for better visibility */}
                <div className="absolute inset-4 rounded-full bg-background/40 backdrop-blur-sm border border-border/20" />

                {/* SVG Circle Progress */}
                <svg className="absolute w-full h-full transform -rotate-90">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="48%"
                        className="stroke-muted fill-none stroke-[6px]"
                    />
                    <circle
                        cx="50%"
                        cy="50%"
                        r="48%"
                        className="stroke-primary fill-none stroke-[6px] transition-all duration-1000 ease-linear rounded-full"
                        style={{
                            strokeDasharray: "300%", // Approx circumference
                            strokeDashoffset: `${300 - (progress / 100 * 300)}%`
                        }}
                        strokeLinecap="round"
                    />
                </svg>

                <div className="z-10 flex flex-col items-center">
                    <Input
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        className="text-center bg-transparent border-none shadow-none text-foreground focus-visible:ring-0 mb-2 h-auto py-0 font-semibold w-40 placeholder:text-muted-foreground [text-shadow:_0_2px_8px_rgb(0_0_0_/_60%)]"
                    />
                    <div className={cn(
                        "text-6xl sm:text-7xl font-black tracking-tighter tabular-nums transition-colors",
                        isActive ? "text-primary [text-shadow:_0_4px_16px_rgb(0_0_0_/_80%),_0_0_32px_currentColor]" : "text-foreground [text-shadow:_0_4px_16px_rgb(0_0_0_/_80%)]"
                    )}>
                        {formatTime(timeLeft)}
                    </div>
                    <div className="mt-4 flex gap-4">
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
                            onClick={toggleTimer}
                        >
                            {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-12 w-12 rounded-full shadow-sm hover:scale-105 transition-transform"
                            onClick={resetTimer}
                        >
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Glowing ring if active */}
                {isActive && (
                    <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl animate-pulse" />
                )}
            </div>

            {/* Presets */}
            <div className="w-full space-y-4">
                <p className="text-xs font-bold text-foreground text-center uppercase tracking-widest [text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]">Quick Start</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setPreset(preset.duration, preset.label)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border bg-background/60 backdrop-blur-sm hover:bg-accent/70 transition-all group aspect-square sm:aspect-auto sm:h-20 shadow-lg",
                                sessionName === preset.label && "border-primary/50 bg-primary/20 ring-2 ring-primary/30"
                            )}
                        >
                            <span className="text-xs sm:text-sm font-bold group-hover:text-primary transition-colors text-center w-full truncate px-1 text-foreground [text-shadow:_0_2px_4px_rgb(0_0_0_/_60%)]">
                                {preset.label}
                            </span>
                            <span className="text-[10px] sm:text-xs text-foreground/80 font-mono mt-1 [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
                                {Math.floor(preset.duration / 60)}m
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2 w-full max-w-xs mx-auto pt-2">
                <Input
                    type="number"
                    placeholder="Min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="text-center bg-background/60 backdrop-blur-sm"
                />
                <Button variant="outline" onClick={() => setPreset(parseInt(customMinutes) * 60, "Custom Session")} className="bg-background/60 backdrop-blur-sm">
                    Set Custom
                </Button>
            </div>
        </div>
    );
}
