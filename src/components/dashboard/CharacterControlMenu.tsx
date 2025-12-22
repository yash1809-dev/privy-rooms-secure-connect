import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Radar, Heart, Scroll, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoryProgress, CHAPTER_NAMES } from "@/contexts/StoryProgressProvider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CharacterControlMenuProps {
    ninjaPos: { x: number; y: number };
    kunoichiPos: { x: number; y: number };
    currentPage: string;
}

export function CharacterControlMenu({ ninjaPos, kunoichiPos, currentPage }: CharacterControlMenuProps) {
    const { storyState, questProgress } = useStoryProgress();
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Map positions to minimap scale
    const mapWidth = 200;
    const mapHeight = 150;
    const ninjaMapX = (ninjaPos.x / screenWidth) * mapWidth;
    const ninjaMapY = (ninjaPos.y / screenHeight) * mapHeight;
    const kunoichiMapX = (kunoichiPos.x / screenWidth) * mapWidth;
    const kunoichiMapY = (kunoichiPos.y / screenHeight) * mapHeight;

    const distance = Math.round(Math.sqrt(
        Math.pow(ninjaPos.x - kunoichiPos.x, 2) +
        Math.pow(ninjaPos.y - kunoichiPos.y, 2)
    ));

    return (
        <div className="w-[320px] max-h-[600px] overflow-y-auto">
            <Accordion type="single" collapsible className="w-full">
                {/* Story Progress Section */}
                <AccordionItem value="story">
                    <AccordionTrigger className="text-sm font-bold">
                        <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-pink-500" />
                            <span>Story Progress</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-4 p-2">
                            {/* Chapter */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-400">Chapter</span>
                                    <span className="text-purple-400 font-bold">{CHAPTER_NAMES[storyState.chapter]}</span>
                                </div>
                            </div>

                            {/* Relationship Level */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-slate-400">Bond Level</span>
                                    <span className="text-pink-400 font-bold">{storyState.relationshipLevel}/100</span>
                                </div>
                                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${storyState.relationshipLevel}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                    {5 - (storyState.relationshipLevel % 5)} levels to next milestone
                                </div>
                            </div>

                            {/* Quests */}
                            <div>
                                <p className="text-xs text-slate-400 mb-2">Quests Completed</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'water_plant_5', name: 'Water Plant 5x', progress: questProgress.water_count, max: 5 },
                                        { id: 'witness_conversation', name: 'Witness Conversations', progress: questProgress.conversation_count, max: 3 },
                                        { id: 'click_50_buttons', name: 'Protect 50 Buttons', progress: questProgress.button_count, max: 50 },
                                    ].map(quest => (
                                        <div key={quest.id} className="flex items-center justify-between text-[11px]">
                                            <span className={cn(
                                                storyState.completedQuests.includes(quest.id) ? "text-green-400 line-through" : "text-slate-300"
                                            )}>
                                                {quest.name}
                                            </span>
                                            <span className="text-slate-500">
                                                {Math.min(quest.progress, quest.max)}/{quest.max}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Secrets */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Secrets Discovered</span>
                                <span className="text-purple-400 font-bold">{storyState.discoveredSecrets.length}/5</span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Minimap Section */}
                <AccordionItem value="minimap">
                    <AccordionTrigger className="text-sm font-bold">
                        <div className="flex items-center gap-2">
                            <Radar className="w-4 h-4 text-cyan-400" />
                            <span>Neural Tracker</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-2 space-y-3">
                            {/* Minimap */}
                            <div
                                className="relative w-full h-[150px] bg-slate-950/50 rounded-lg border border-cyan-500/20 overflow-hidden"
                                style={{
                                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(6,182,212,0.15) 1px, transparent 0)',
                                    backgroundSize: '20px 20px'
                                }}
                            >
                                {/* Page indicator */}
                                <div className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/70 bg-black/50 px-2 py-0.5 rounded">
                                    {currentPage.toUpperCase().replace('/', '') || 'HOME'}
                                </div>

                                {/* Shadow marker */}
                                <motion.div
                                    className="absolute"
                                    animate={{ left: ninjaMapX - 6, top: ninjaMapY - 6 }}
                                    transition={{ type: "spring", damping: 20 }}
                                >
                                    <div className="relative">
                                        <motion.div
                                            className="absolute inset-0 bg-teal-500 rounded-full"
                                            animate={{ scale: [1, 2, 2], opacity: [0.6, 0, 0] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <div className="w-3 h-3 bg-teal-500 rounded-full border border-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.8)]">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-teal-400">S</div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Sakura marker */}
                                <motion.div
                                    className="absolute"
                                    animate={{ left: kunoichiMapX - 6, top: kunoichiMapY - 6 }}
                                    transition={{ type: "spring", damping: 20 }}
                                >
                                    <div className="relative">
                                        <motion.div
                                            className="absolute inset-0 bg-pink-500 rounded-full"
                                            animate={{ scale: [1, 2, 2], opacity: [0.6, 0, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                        />
                                        <div className="w-3 h-3 bg-pink-500 rounded-full border border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-pink-400">K</div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Connection line */}
                                <svg className="absolute inset-0 pointer-events-none">
                                    <line
                                        x1={ninjaMapX}
                                        y1={ninjaMapY}
                                        x2={kunoichiMapX}
                                        y2={kunoichiMapY}
                                        stroke="url(#gradient)"
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                        opacity="0.4"
                                    />
                                    <defs>
                                        <linearGradient id="gradient">
                                            <stop offset="0%" stopColor="#14b8a6" />
                                            <stop offset="100%" stopColor="#ec4899" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>

                            {/* Coordinates */}
                            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                                <div className="bg-teal-500/10 border border-teal-500/30 rounded px-2 py-1">
                                    <div className="text-teal-400 font-black">SHADOW</div>
                                    <div className="text-teal-300/70">X:{Math.round(ninjaPos.x)} Y:{Math.round(ninjaPos.y)}</div>
                                </div>
                                <div className="bg-pink-500/10 border border-pink-500/30 rounded px-2 py-1">
                                    <div className="text-pink-400 font-black">SAKURA</div>
                                    <div className="text-pink-300/70">X:{Math.round(kunoichiPos.x)} Y:{Math.round(kunoichiPos.y)}</div>
                                </div>
                            </div>

                            {/* Distance */}
                            <div className="text-center text-[10px] text-cyan-400/70 font-mono">
                                Distance: {distance}px
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
