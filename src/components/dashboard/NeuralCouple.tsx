import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Heart, MessageCircle, Zap, Shield, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStoryProgress } from "@/contexts/StoryProgressProvider";
import { toast } from "sonner";

interface NeuralCoupleProps {
    status?: 'idle' | 'focusing' | 'excited' | 'greeting';
    onPositionChange?: (ninja: { x: number; y: number }, kunoichi: { x: number; y: number }) => void;
}

type Mood = 'idle' | 'focusing' | 'excited' | 'striking' | 'angry' | 'walking' | 'love' | 'happy' | 'talking';

interface Character {
    id: string;
    name: string;
    position: { x: number; y: number };
    mood: Mood;
    currentThought: string | null;
    isWatering: boolean;
    isTeleporting: boolean;
    showInteractionMenu: boolean;
    isDragging: boolean;
}

// Idle dialogue system - Tech/productivity themed
const IDLE_DIALOGUES = [
    { type: 'shadow', text: "Systems nominal." },
    { type: 'sakura', text: "All clear here." },
    { type: 'shadow', text: "Focus levels optimal." },
    { type: 'sakura', text: "You're doing great!" },
    { type: 'shadow', text: "Ready when you are." },
    { type: 'sakura', text: "Stay productive!" },
    { type: 'conversation', shadow: "Status report?", sakura: "All systems go!" },
    { type: 'conversation', shadow: "Nice progress today.", sakura: "Agreed." },
    { type: 'shadow', text: "Monitoring active." },
    { type: 'sakura', text: "Keep it up!" },
];

const PET_DIALOGUES = ["Thanks!", "Appreciated.", "System boost!", "Energy +10%"];
const TALK_DIALOGUES = ["At your service.", "Ready for tasks.", "Understood.", "Acknowledged."];

const MARGIN = 60; // Safe margin from screen edges
const ROAM_INTERVAL = 20000;
const IDLE_TALK_INTERVAL = 25000;

export function NeuralCouple({ status = 'idle', onPositionChange }: NeuralCoupleProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { increaseRelationship, incrementQuestProgress } = useStoryProgress();

    const getInitialPos = (offsetX: number) => ({
        x: Math.min(window.innerWidth - 100, Math.max(MARGIN, window.innerWidth - offsetX)),
        y: Math.min(window.innerHeight - 150, Math.max(MARGIN, window.innerHeight - 200))
    });

    const [ninja, setNinja] = useState<Character>({
        id: 'ninja',
        name: 'Shadow',
        position: getInitialPos(120),
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        showInteractionMenu: false,
        isDragging: false,
    });

    const [kunoichi, setKunoichi] = useState<Character>({
        id: 'kunoichi',
        name: 'Sakura',
        position: getInitialPos(220),
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        showInteractionMenu: false,
        isDragging: false,
    });

    const ninjaRef = useRef<HTMLDivElement>(null);
    const kunoichiRef = useRef<HTMLDivElement>(null);

    // Clamp position to viewport
    const clampPosition = useCallback((x: number, y: number) => ({
        x: Math.max(MARGIN, Math.min(window.innerWidth - MARGIN - 80, x)),
        y: Math.max(MARGIN, Math.min(window.innerHeight - MARGIN - 120, y))
    }), []);

    // Notify parent of position changes for minimap
    useEffect(() => {
        onPositionChange?.(ninja.position, kunoichi.position);
    }, [ninja.position, kunoichi.position, onPositionChange]);

    // Idle Dialogue System
    useEffect(() => {
        if (status === 'focusing' || ninja.isDragging || kunoichi.isDragging) return;

        const showIdleDialogue = () => {
            const dialogue = IDLE_DIALOGUES[Math.floor(Math.random() * IDLE_DIALOGUES.length)];

            if (dialogue.type === 'shadow') {
                setNinja(prev => ({ ...prev, currentThought: dialogue.text, mood: 'talking' }));
                setTimeout(() => setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 4000);
            } else if (dialogue.type === 'sakura') {
                setKunoichi(prev => ({ ...prev, currentThought: dialogue.text, mood: 'talking' }));
                setTimeout(() => setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 4000);
            } else if (dialogue.type === 'conversation') {
                setNinja(prev => ({ ...prev, currentThought: dialogue.shadow, mood: 'talking' }));
                setTimeout(() => {
                    setKunoichi(prev => ({ ...prev, currentThought: dialogue.sakura, mood: 'talking' }));
                }, 1500);
                setTimeout(() => {
                    setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                }, 5000);
            }
        };

        const interval = setInterval(showIdleDialogue, IDLE_TALK_INTERVAL);
        return () => clearInterval(interval);
    }, [status, ninja.isDragging, kunoichi.isDragging]);

    // Free Roaming Logic - Both roam independently
    useEffect(() => {
        const roam = () => {
            if (ninja.isDragging || kunoichi.isDragging || status === 'focusing') return;
            if (ninja.currentThought || kunoichi.currentThought) return; // Don't move while talking

            const shouldNinjaRoam = Math.random() > 0.5;
            const shouldSakuraRoam = Math.random() > 0.5;

            if (shouldNinjaRoam) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + 50,
                    Math.random() * (window.innerHeight - 200) + 50
                );
                walkCharacter('ninja', newPos.x, newPos.y);
            }

            if (shouldSakuraRoam) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + 50,
                    Math.random() * (window.innerHeight - 200) + 50
                );
                walkCharacter('kunoichi', newPos.x, newPos.y);
            }
        };

        const interval = setInterval(roam, ROAM_INTERVAL);
        return () => clearInterval(interval);
    }, [ninja.isDragging, kunoichi.isDragging, ninja.currentThought, kunoichi.currentThought, status, clampPosition]);

    // Handle focus status
    useEffect(() => {
        if (status === 'focusing') {
            const plant = document.getElementById('focus-plant-container');
            if (plant) {
                const rect = plant.getBoundingClientRect();
                const whoWaters = Math.random() > 0.5 ? 'ninja' : 'kunoichi';
                const pos = clampPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);

                if (whoWaters === 'ninja') {
                    walkCharacter('ninja', pos.x + 40, pos.y, true);
                    setKunoichi(prev => ({ ...prev, currentThought: "Focus mode active.", mood: 'talking' }));
                    setTimeout(() => setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                    incrementQuestProgress('water');
                } else {
                    walkCharacter('kunoichi', pos.x - 40, pos.y, true);
                    setNinja(prev => ({ ...prev, currentThought: "Supporting.", mood: 'talking' }));
                    setTimeout(() => setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                    incrementQuestProgress('water');
                }
            }
        }
    }, [status, incrementQuestProgress, clampPosition]);

    const walkCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, startWatering = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const clampedPos = clampPosition(newX, newY);
        setter(prev => ({ ...prev, mood: 'walking', position: clampedPos }));
        setTimeout(() => {
            setter(prev => ({ ...prev, isWatering: startWatering, mood: startWatering ? 'focusing' : 'idle' }));
        }, 1000);
    }, [clampPosition]);

    const teleportCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, shouldStrike = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const clampedPos = clampPosition(newX, newY);
        setter(prev => ({ ...prev, isTeleporting: true }));
        setTimeout(() => {
            setter(prev => ({ ...prev, position: clampedPos, mood: shouldStrike ? 'striking' : prev.mood }));
            setTimeout(() => {
                setter(prev => ({ ...prev, isTeleporting: false }));
                if (shouldStrike) {
                    setTimeout(() => setter(prev => ({ ...prev, mood: 'idle' })), 800);
                }
            }, 300);
        }, 300);
    }, [clampPosition]);

    // Button protection
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInteraction = target.closest('button') || target.closest('a');

            if (isInteraction && !ninjaRef.current?.contains(target) && !kunoichiRef.current?.contains(target)) {
                const rect = (target.closest('button') || target.closest('a'))!.getBoundingClientRect();
                const whoStrikes = Math.random() > 0.5 ? 'ninja' : 'kunoichi';
                teleportCharacter(whoStrikes, rect.left - 20, rect.top - 20, true);
                incrementQuestProgress('button');
            }
        };

        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [teleportCharacter, incrementQuestProgress]);

    // Character interactions
    const handleCharacterClick = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, showInteractionMenu: !prev.showInteractionMenu }));
    };

    const handlePet = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const dialogue = PET_DIALOGUES[Math.floor(Math.random() * PET_DIALOGUES.length)];
        setter(prev => ({ ...prev, currentThought: dialogue, mood: 'happy', showInteractionMenu: false }));
        increaseRelationship(2);
        toast.success("💕 Bond Strengthened!", { description: `${charId === 'ninja' ? 'Shadow' : 'Sakura'} sync improved!`, duration: 2000 });
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 3000);
    };

    const handleTalk = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const dialogue = TALK_DIALOGUES[Math.floor(Math.random() * TALK_DIALOGUES.length)];
        setter(prev => ({ ...prev, currentThought: dialogue, mood: 'talking', showInteractionMenu: false }));
        increaseRelationship(1);
        incrementQuestProgress('conversation');
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 3000);
    };

    const handleDragStart = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, isDragging: true, showInteractionMenu: false, currentThought: null }));
    };

    const handleDragEnd = (charId: 'ninja' | 'kunoichi', info: any) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const clampedPos = clampPosition(info.point.x - 40, info.point.y - 50);
        setter(prev => ({
            ...prev,
            isDragging: false,
            position: clampedPos,
            mood: 'idle'
        }));
    };

    // Get drag constraints
    const getDragConstraints = () => ({
        left: MARGIN,
        right: window.innerWidth - MARGIN - 80,
        top: MARGIN,
        bottom: window.innerHeight - MARGIN - 120
    });

    return (
        <>
            <HolographicAvatar
                character={ninja}
                charRef={ninjaRef}
                theme="cyan"
                onClick={() => handleCharacterClick('ninja')}
                onPet={() => handlePet('ninja')}
                onTalk={() => handleTalk('ninja')}
                onDragStart={() => handleDragStart('ninja')}
                onDragEnd={(info: any) => handleDragEnd('ninja', info)}
                dragConstraints={getDragConstraints()}
            />
            <HolographicAvatar
                character={kunoichi}
                charRef={kunoichiRef}
                theme="pink"
                onClick={() => handleCharacterClick('kunoichi')}
                onPet={() => handlePet('kunoichi')}
                onTalk={() => handleTalk('kunoichi')}
                onDragStart={() => handleDragStart('kunoichi')}
                onDragEnd={(info: any) => handleDragEnd('kunoichi', info)}
                dragConstraints={getDragConstraints()}
            />
        </>
    );
}

// Professional Holographic AI Avatar Component
function HolographicAvatar({ character, charRef, theme, onClick, onPet, onTalk, onDragStart, onDragEnd, dragConstraints }: {
    character: Character;
    charRef: React.RefObject<HTMLDivElement>;
    theme: 'cyan' | 'pink';
    onClick: () => void;
    onPet: () => void;
    onTalk: () => void;
    onDragStart: () => void;
    onDragEnd: (info: any) => void;
    dragConstraints: { left: number; right: number; top: number; bottom: number };
}) {
    const colors = theme === 'cyan'
        ? { primary: 'cyan', glow: 'rgba(6, 182, 212, 0.6)', accent: '#22d3ee', bg: 'from-cyan-500/20' }
        : { primary: 'pink', glow: 'rgba(236, 72, 153, 0.6)', accent: '#f472b6', bg: 'from-pink-500/20' };

    const getBubbleStyle = () => {
        const x = character.position.x;
        const w = window.innerWidth;
        if (x > w - 180) return { right: '100%', marginRight: '8px' };
        if (x < 180) return { left: '100%', marginLeft: '8px' };
        return { left: '50%', transform: 'translateX(-50%)', bottom: '100%', marginBottom: '8px' };
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={dragConstraints}
            onDragStart={onDragStart}
            onDragEnd={(e, info) => onDragEnd(info)}
            className="fixed z-[9999] cursor-grab active:cursor-grabbing touch-none select-none"
            style={{
                left: character.position.x,
                top: character.position.y,
                transition: character.isDragging ? 'none' : 'left 0.8s ease-out, top 0.8s ease-out'
            }}
        >
            <motion.div
                ref={charRef}
                animate={{
                    scale: character.isTeleporting ? 0 : 1,
                    y: character.mood === 'walking' ? [0, -4, 0] : 0,
                }}
                transition={{ y: { repeat: Infinity, duration: 0.5 } }}
                className="relative w-20 h-28 group"
                onClick={onClick}
                whileHover={{ scale: 1.05 }}
            >
                {/* Interaction Menu */}
                <AnimatePresence>
                    {character.showInteractionMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-2 z-50"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onPet(); }}
                                className={cn("p-2 rounded-full shadow-lg border transition-transform hover:scale-110",
                                    theme === 'cyan' ? "bg-slate-900 border-cyan-500/50" : "bg-slate-900 border-pink-500/50")}>
                                <Heart className={cn("w-4 h-4", theme === 'cyan' ? "text-cyan-400" : "text-pink-400")} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onTalk(); }}
                                className={cn("p-2 rounded-full shadow-lg border transition-transform hover:scale-110",
                                    theme === 'cyan' ? "bg-slate-900 border-cyan-500/50" : "bg-slate-900 border-pink-500/50")}>
                                <MessageCircle className={cn("w-4 h-4", theme === 'cyan' ? "text-cyan-400" : "text-pink-400")} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Speech Bubble */}
                <AnimatePresence>
                    {character.currentThought && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute z-50 pointer-events-none whitespace-nowrap"
                            style={getBubbleStyle()}
                        >
                            <div className={cn(
                                "px-3 py-2 rounded-xl shadow-xl border text-xs font-medium",
                                theme === 'cyan' ? "bg-slate-900/95 border-cyan-500/40 text-cyan-100" : "bg-slate-900/95 border-pink-500/40 text-pink-100"
                            )}>
                                {character.currentThought}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HOLOGRAPHIC AI AVATAR */}
                <div className="relative w-full h-full flex flex-col items-center">

                    {/* Outer Glow Ring */}
                    <motion.div
                        animate={{ rotate: 360, opacity: [0.3, 0.6, 0.3] }}
                        transition={{ rotate: { repeat: Infinity, duration: 8, ease: 'linear' }, opacity: { repeat: Infinity, duration: 2 } }}
                        className={cn("absolute inset-0 rounded-full border-2 border-dashed opacity-40",
                            theme === 'cyan' ? "border-cyan-500" : "border-pink-500")}
                        style={{ width: '100%', height: '100%' }}
                    />

                    {/* HEAD: Digital Visor */}
                    <div className={cn(
                        "relative z-20 w-14 h-12 rounded-[1rem] shadow-xl flex items-center justify-center overflow-hidden",
                        "bg-gradient-to-b from-slate-800 to-slate-900 border",
                        theme === 'cyan' ? "border-cyan-500/50" : "border-pink-500/50"
                    )}>
                        {/* Visor Display */}
                        <div className={cn(
                            "w-10 h-4 rounded-full flex items-center justify-center gap-1",
                            "bg-gradient-to-r",
                            theme === 'cyan' ? "from-cyan-500/20 via-cyan-400/40 to-cyan-500/20" : "from-pink-500/20 via-pink-400/40 to-pink-500/20"
                        )}>
                            {/* Eyes as scanning lines */}
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className={cn("w-2 h-2 rounded-full", theme === 'cyan' ? "bg-cyan-400" : "bg-pink-400")}
                            />
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                className={cn("w-2 h-2 rounded-full", theme === 'cyan' ? "bg-cyan-400" : "bg-pink-400")}
                            />
                        </div>

                        {/* Data Lines */}
                        <motion.div
                            animate={{ x: [-20, 20] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            className={cn("absolute bottom-1 h-[1px] w-8", theme === 'cyan' ? "bg-cyan-500/50" : "bg-pink-500/50")}
                        />
                    </div>

                    {/* BODY: Geometric Armor */}
                    <div className={cn(
                        "relative z-10 w-12 h-12 -mt-1 rounded-b-2xl shadow-lg flex items-center justify-center",
                        "bg-gradient-to-b from-slate-800 to-slate-950 border-x border-b",
                        theme === 'cyan' ? "border-cyan-500/40" : "border-pink-500/40"
                    )}>
                        {/* Energy Core */}
                        <motion.div
                            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={cn("w-4 h-4 rounded-full", theme === 'cyan' ? "bg-cyan-500/30" : "bg-pink-500/30")}
                        >
                            <div className={cn("absolute inset-1 rounded-full", theme === 'cyan' ? "bg-cyan-400" : "bg-pink-400")}
                                style={{ boxShadow: `0 0 10px ${colors.accent}` }} />
                        </motion.div>

                        {/* Armor Lines */}
                        <div className={cn("absolute top-2 left-0 w-full h-[1px]", theme === 'cyan' ? "bg-cyan-500/30" : "bg-pink-500/30")} />
                        <div className={cn("absolute bottom-3 left-2 right-2 h-[1px]", theme === 'cyan' ? "bg-cyan-500/20" : "bg-pink-500/20")} />
                    </div>

                    {/* Data Particles */}
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{
                                y: [0, -30, 0],
                                x: [(i - 1) * 10, (i - 1) * 15, (i - 1) * 10],
                                opacity: [0, 0.6, 0]
                            }}
                            transition={{ repeat: Infinity, duration: 3, delay: i * 0.8 }}
                            className={cn("absolute top-4 w-1 h-1 rounded-full", theme === 'cyan' ? "bg-cyan-400" : "bg-pink-400")}
                        />
                    ))}

                    {/* Base Glow */}
                    <div className={cn(
                        "absolute -bottom-2 w-16 h-3 rounded-full blur-md opacity-50",
                        theme === 'cyan' ? "bg-cyan-500" : "bg-pink-500"
                    )} />
                </div>

                {/* Ambient Aura */}
                <div className={cn(
                    "absolute inset-0 -z-10 rounded-full blur-3xl opacity-20 scale-150",
                    theme === 'cyan' ? "bg-cyan-500" : "bg-pink-500"
                )} />
            </motion.div>
        </motion.div>
    );
}
