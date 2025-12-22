import { motion } from "framer-motion";
import { MapPin, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinimapProps {
    ninjaPos: { x: number; y: number };
    kunoichiPos: { x: number; y: number };
    currentPage: string;
}

export function CharacterMinimap({ ninjaPos, kunoichiPos, currentPage }: MinimapProps) {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Map positions to minimap scale (200x150px minimap)
    const mapWidth = 200;
    const mapHeight = 150;

    const ninjaMapX = (ninjaPos.x / screenWidth) * mapWidth;
    const ninjaMapY = (ninjaPos.y / screenHeight) * mapHeight;
    const kunoichiMapX = (kunoichiPos.x / screenWidth) * mapWidth;
    const kunoichiMapY = (kunoichiPos.y / screenHeight) * mapHeight;

    return (
        <div className="fixed bottom-4 left-4 z-[10000] pointer-events-auto">
            <div className="relative bg-black/90 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <Radar className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Neural Tracker</span>
                </div>

                {/* Minimap */}
                <div
                    className="relative w-[200px] h-[150px] bg-slate-950/50 rounded-lg border border-cyan-500/20 overflow-hidden"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(6,182,212,0.15) 1px, transparent 0)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-30">
                        <svg width="100%" height="100%">
                            <defs>
                                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(6,182,212,0.2)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    {/* Page indicator */}
                    <div className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/70 bg-black/50 px-2 py-0.5 rounded">
                        {currentPage.toUpperCase()}
                    </div>

                    {/* Shadow (Ninja) marker */}
                    <motion.div
                        className="absolute"
                        animate={{
                            left: ninjaMapX - 6,
                            top: ninjaMapY - 6,
                        }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    >
                        <div className="relative">
                            {/* Ping effect */}
                            <motion.div
                                className="absolute inset-0 bg-teal-500 rounded-full"
                                animate={{ scale: [1, 2, 2], opacity: [0.6, 0, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            {/* Marker */}
                            <div className="w-3 h-3 bg-teal-500 rounded-full border border-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.8)]">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black text-teal-400">
                                    S
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Sakura (Kunoichi) marker */}
                    <motion.div
                        className="absolute"
                        animate={{
                            left: kunoichiMapX - 6,
                            top: kunoichiMapY - 6,
                        }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    >
                        <div className="relative">
                            {/* Ping effect */}
                            <motion.div
                                className="absolute inset-0 bg-pink-500 rounded-full"
                                animate={{ scale: [1, 2, 2], opacity: [0.6, 0, 0] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            />
                            {/* Marker */}
                            <div className="w-3 h-3 bg-pink-500 rounded-full border border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black text-pink-400">
                                    K
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Connection line between them */}
                    <svg className="absolute inset-0 pointer-events-none">
                        <motion.line
                            x1={ninjaMapX}
                            y1={ninjaMapY}
                            x2={kunoichiMapX}
                            y2={kunoichiMapY}
                            stroke="url(#connectionGradient)"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.4"
                        />
                        <defs>
                            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#14b8a6" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Coordinates display */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[8px] font-mono">
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded px-2 py-1">
                        <div className="text-teal-400 font-black">SHADOW</div>
                        <div className="text-teal-300/70">
                            X:{Math.round(ninjaPos.x)} Y:{Math.round(ninjaPos.y)}
                        </div>
                    </div>
                    <div className="bg-pink-500/10 border border-pink-500/30 rounded px-2 py-1">
                        <div className="text-pink-400 font-black">SAKURA</div>
                        <div className="text-pink-300/70">
                            X:{Math.round(kunoichiPos.x)} Y:{Math.round(kunoichiPos.y)}
                        </div>
                    </div>
                </div>

                {/* Distance between them */}
                <div className="mt-2 text-center">
                    <div className="text-[8px] text-cyan-400/70 font-mono">
                        Distance: {Math.round(Math.sqrt(
                            Math.pow(ninjaPos.x - kunoichiPos.x, 2) +
                            Math.pow(ninjaPos.y - kunoichiPos.y, 2)
                        ))}px
                    </div>
                </div>
            </div>
        </div>
    );
}
