import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Sparkles, Cloud, Sword, Droplets, Heart, Star,
    Hand, MessageCircle, Navigation
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStoryProgress } from "@/contexts/StoryProgressProvider";
import { toast } from "sonner";

interface NeuralCoupleProps {
    status?: 'idle' | 'focusing' | 'excited' | 'greeting';
    onPositionChange?: (ninja: { x: number; y: number }, kunoichi: { x: number; y: number }) => void;
}

type Mood = 'idle' | 'focusing' | 'excited' | 'striking' | 'angry' | 'walking' | 'love' | 'happy';

interface Character {
    id: string;
    name: string;
    position: { x: number; y: number };
    mood: Mood;
    currentThought: string | null;
    isWatering: boolean;
    isTeleporting: boolean;
    showInteractionMenu: boolean;
}

const DIALOGUES = {
    pet: [
        "That feels nice!",
        "Hehe, I like that!",
        "*purrs softly*",
        "You're so kind!",
    ],
    talk: [
        "Ready for anything!",
        "Let's protect the user together.",
        "This mission is important.",
        "Stay vigilant!",
    ],
};

export function NeuralCouple({ status = 'idle', onPositionChange }: NeuralCoupleProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { increaseRelationship, incrementQuestProgress } = useStoryProgress();

    const [ninja, setNinja] = useState<Character>({
        id: 'ninja',
        name: 'Shadow',
        position: { x: window.innerWidth - 120, y: window.innerHeight - 150 },
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        showInteractionMenu: false,
    });

    const [kunoichi, setKunoichi] = useState<Character>({
        id: 'kunoichi',
        name: 'Sakura',
        position: { x: window.innerWidth - 220, y: window.innerHeight - 150 },
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        showInteractionMenu: false,
    });

    const [isPlantVisible, setIsPlantVisible] = useState(true);
    const wasWateringRef = useRef({ ninja: false, kunoichi: false });
    const ninjaRef = useRef<HTMLDivElement>(null);
    const kunoichiRef = useRef<HTMLDivElement>(null);

    // Notify parent of position changes for minimap
    useEffect(() => {
        onPositionChange?.(ninja.position, kunoichi.position);
    }, [ninja.position, kunoichi.position, onPositionChange]);

    // Plant visibility detection
    useEffect(() => {
        const plantObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const wasVisible = isPlantVisible;
                    const nowVisible = entry.isIntersecting;
                    setIsPlantVisible(nowVisible);

                    if (wasVisible && !nowVisible) {
                        if (wasWateringRef.current.ninja) {
                            setNinja(prev => ({
                                ...prev,
                                mood: 'angry',
                                currentThought: "Hey! I was watering that!",
                                isWatering: false,
                            }));

                            setTimeout(() => {
                                setKunoichi(prev => ({ ...prev, currentThought: "It's okay...", mood: 'love' }));
                            }, 500);

                            setTimeout(() => {
                                setNinja(prev => ({ ...prev, mood: 'idle', currentThought: null }));
                                setKunoichi(prev => ({ ...prev, mood: 'idle', currentThought: null }));
                            }, 3000);
                        }

                        if (wasWateringRef.current.kunoichi) {
                            setKunoichi(prev => ({
                                ...prev,
                                mood: 'angry',
                                currentThought: "Where did it go?!",
                                isWatering: false,
                            }));

                            setTimeout(() => {
                                setNinja(prev => ({ ...prev, currentThought: "Don't worry.", mood: 'love' }));
                            }, 500);

                            setTimeout(() => {
                                setNinja(prev => ({ ...prev, mood: 'idle', currentThought: null }));
                                setKunoichi(prev => ({ ...prev, mood: 'idle', currentThought: null }));
                            }, 3000);
                        }
                    }
                });
            },
            { threshold: 0.3 }
        );

        const plantElement = document.getElementById('focus-plant-container');
        if (plantElement) {
            plantObserver.observe(plantElement);
        }

        return () => plantObserver.disconnect();
    }, [isPlantVisible]);

    useEffect(() => {
        wasWateringRef.current.ninja = ninja.isWatering;
        wasWateringRef.current.kunoichi = kunoichi.isWatering;
    }, [ninja.isWatering, kunoichi.isWatering]);

    // Handle focus status
    useEffect(() => {
        if (status === 'focusing') {
            const plant = document.getElementById('focus-plant-container');
            if (plant && isPlantVisible) {
                const rect = plant.getBoundingClientRect();
                const whoWaters = Math.random() > 0.5 ? 'ninja' : 'kunoichi';

                if (whoWaters === 'ninja') {
                    walkCharacter('ninja', rect.left + rect.width / 2 + 40, rect.top + rect.height / 2, true);
                    setKunoichi(prev => ({ ...prev, currentThought: "You got this!", mood: 'love' }));
                    setTimeout(() => setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                    incrementQuestProgress('water');
                } else {
                    walkCharacter('kunoichi', rect.left + rect.width / 2 - 40, rect.top + rect.height / 2, true);
                    setNinja(prev => ({ ...prev, currentThought: "Perfect!", mood: 'love' }));
                    setTimeout(() => setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                    incrementQuestProgress('water');
                }
            }
        }
    }, [status, isPlantVisible, incrementQuestProgress]);

    const walkCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, startWatering = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, mood: 'walking', position: { x: newX, y: newY } }));
        setTimeout(() => {
            setter(prev => ({ ...prev, isWatering: startWatering, mood: startWatering ? 'focusing' : 'idle' }));
        }, 800);
    }, []);

    const teleportCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, shouldStrike = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, isTeleporting: true }));
        setTimeout(() => {
            setter(prev => ({ ...prev, position: { x: newX, y: newY }, mood: shouldStrike ? 'striking' : prev.mood }));
            setTimeout(() => {
                setter(prev => ({ ...prev, isTeleporting: false }));
                if (shouldStrike) {
                    setTimeout(() => setter(prev => ({ ...prev, mood: 'idle' })), 800);
                }
            }, 300);
        }, 300);
    }, []);

    // Button protection
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInteraction = target.closest('button') || target.closest('a');

            if (isInteraction && !ninjaRef.current?.contains(target) && !kunoichiRef.current?.contains(target)) {
                const rect = (target.closest('button') || target.closest('a'))!.getBoundingClientRect();
                const whoStrikes = Math.random() > 0.5 ? 'ninja' : 'kunoichi';
                teleportCharacter(whoStrikes, rect.left - 20, rect.top - 20, true);

                const partner = whoStrikes === 'ninja' ? 'kunoichi' : 'ninja';
                const partnerSetter = partner === 'ninja' ? setNinja : setKunoichi;
                partnerSetter(prev => ({ ...prev, currentThought: "Nice!", mood: 'love' }));
                setTimeout(() => partnerSetter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 1500);

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
        const dialogue = DIALOGUES.pet[Math.floor(Math.random() * DIALOGUES.pet.length)];

        setter(prev => ({ ...prev, currentThought: dialogue, mood: 'happy', showInteractionMenu: false }));
        increaseRelationship(2);

        toast.success("💕 Bond Strengthened!", {
            description: `${charId === 'ninja' ? 'Shadow' : 'Sakura'} appreciates your affection!`,
            duration: 3000,
        });

        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 3000);
    };

    const handleTalk = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const dialogue = DIALOGUES.talk[Math.floor(Math.random() * DIALOGUES.talk.length)];

        setter(prev => ({ ...prev, currentThought: dialogue, showInteractionMenu: false }));
        increaseRelationship(1);
        incrementQuestProgress('conversation');

        setTimeout(() => setter(prev => ({ ...prev, currentThought: null })), 3000);
    };

    return (
        <>
            <ShinobiCharacter
                character={ninja}
                charRef={ninjaRef}
                onClick={() => handleCharacterClick('ninja')}
                onPet={() => handlePet('ninja')}
                onTalk={() => handleTalk('ninja')}
            />
            <KunoichiCharacter
                character={kunoichi}
                charRef={kunoichiRef}
                onClick={() => handleCharacterClick('kunoichi')}
                onPet={() => handlePet('kunoichi')}
                onTalk={() => handleTalk('kunoichi')}
            />
        </>
    );
}

// Enhanced Ninja Character with Alert Eyes
function ShinobiCharacter({ character, charRef, onClick, onPet, onTalk }: {
    character: Character;
    charRef: React.RefObject<HTMLDivElement>;
    onClick: () => void;
    onPet: () => void;
    onTalk: () => void;
}) {
    const getBubblePosition = () => {
        const screenWidth = window.innerWidth;
        const charX = character.position.x;
        if (charX > screenWidth - 200) return { left: 'auto', right: '100%', marginRight: '10px', whiteSpace: 'nowrap' as const };
        if (charX < 200) return { left: '100%', right: 'auto', marginLeft: '10px', whiteSpace: 'nowrap' as const };
        return { left: '50%', transform: 'translateX(-50%)', top: '-70px', whiteSpace: 'nowrap' as const };
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none transition-all duration-700 ease-out"
            style={{ left: character.position.x, top: character.position.y }}
        >
            <AnimatePresence>
                {character.isTeleporting && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 2 }}
                        exit={{ opacity: 0, scale: 3 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        <Cloud className="w-16 h-16 text-slate-400/30 blur-md fill-slate-400/10" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                ref={charRef}
                animate={{
                    scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.8 : 1.2),
                    y: character.mood === 'idle' || character.mood === 'walking' ? [0, -5, 0] : 0,
                }}
                transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="relative w-24 h-28 pointer-events-auto cursor-pointer group"
                onClick={onClick}
                whileHover={{ scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.85 : 1.25) }}
            >
                {/* Interaction Menu */}
                <AnimatePresence>
                    {character.showInteractionMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl p-2 shadow-2xl z-50 flex gap-2"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onPet(); }}
                                className="px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-xl text-xs text-pink-300 font-bold flex items-center gap-1 transition-all hover:scale-105"
                            >
                                <Hand className="w-3 h-3" /> Pet
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onTalk(); }}
                                className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 font-bold flex items-center gap-1 transition-all hover:scale-105"
                            >
                                <MessageCircle className="w-3 h-3" /> Talk
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Thought Bubble */}
                <AnimatePresence>
                    {character.currentThought && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none whitespace-nowrap z-50"
                            style={getBubblePosition()}
                        >
                            <div className={cn(
                                "relative px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-2",
                                character.mood === 'angry' ? "bg-red-100 border-red-600" :
                                    character.mood === 'love' || character.mood === 'happy' ? "bg-pink-100 border-pink-500" :
                                        "bg-white border-slate-900"
                            )}>
                                <p className={cn(
                                    "text-[11px] font-bold",
                                    character.mood === 'angry' ? "text-red-900" :
                                        character.mood === 'love' || character.mood === 'happy' ? "text-pink-700" :
                                            "text-slate-900"
                                )}>{character.currentThought}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Enhanced SWORD */}
                <AnimatePresence>
                    {character.mood === 'striking' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: -50, rotate: -90 }}
                            animate={{ opacity: 1, x: 30, rotate: 45 }}
                            exit={{ opacity: 0, x: 50, rotate: 90 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 z-30"
                        >
                            <Sword className="w-12 h-12 text-cyan-200 drop-shadow-[0_0_20px_rgba(6,182,212,1)]" strokeWidth={2.5} />
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 2, opacity: [0, 1, 0] }}
                                transition={{ duration: 0.4 }}
                                className="absolute top-1/2 left-0 h-1 w-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm"
                            />
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, rotate: 0 }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        rotate: [0, 180],
                                        x: [0, (i - 1) * 20],
                                        y: [0, (i - 1) * 15]
                                    }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="absolute top-0 left-0"
                                >
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Watering Animation */}
                <AnimatePresence>
                    {character.isWatering && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: -12 }}
                            exit={{ opacity: 0 }}
                            className="absolute -left-12 top-6 z-20"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-teal-500/30 border-2 border-teal-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                                    <Droplets className="w-6 h-6 text-teal-400 animate-bounce" />
                                </div>
                                {[...Array(4)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, 25], opacity: [0, 1, 0], x: [0, -12] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                                        className="absolute top-10 right-5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_4px_rgba(20,184,166,1)]"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Love Hearts */}
                <AnimatePresence>
                    {(character.mood === 'love' || character.mood === 'happy') && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0, y: 0 }}
                            animate={{ opacity: 1, scale: 1, y: -25 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-8 right-0 z-20"
                        >
                            <Heart className="w-7 h-7 text-pink-500 fill-pink-500 animate-pulse drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Enhanced Ninja Character Design with ALERT EYES */}
                <div className="relative w-full h-full flex flex-col items-center">
                    {/* Head with better shading */}
                    <div className="relative w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-950 rounded-full border-2 border-cyan-500/30 overflow-hidden shadow-2xl">
                        {/* Mask lower half */}
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-b from-slate-900 to-black border-t-2 border-cyan-500/20" />

                        {/* ALERT ROUNDED EYES - NOT SLEEPY! */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1.5">
                            {/* Left Eye */}
                            <motion.div
                                animate={{
                                    scaleY: [1, 1, 0.05, 1], // Blink animation
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 4,
                                    repeatDelay: 3
                                }}
                                className="w-4 h-4 rounded-full bg-white border border-slate-800 relative shadow-inner"
                            >
                                {/* Iris */}
                                <div className={cn(
                                    "absolute inset-1 rounded-full transition-colors",
                                    character.mood === 'angry' ? "bg-red-500" :
                                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-400" :
                                            "bg-cyan-400"
                                )}>
                                    {/* Pupil */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    {/* Highlight sparkle */}
                                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
                                </div>
                            </motion.div>

                            {/* Right Eye */}
                            <motion.div
                                animate={{
                                    scaleY: [1, 1, 0.05, 1],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 4,
                                    delay: 0.1,
                                    repeatDelay: 3
                                }}
                                className="w-4 h-4 rounded-full bg-white border border-slate-800 relative shadow-inner"
                            >
                                <div className={cn(
                                    "absolute inset-1 rounded-full transition-colors",
                                    character.mood === 'angry' ? "bg-red-500" :
                                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-400" :
                                            "bg-cyan-400"
                                )}>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Headband ribbon */}
                        <motion.div
                            animate={{ rotate: character.mood === 'angry' ? [-10, 10, -10] : [-5, 5, -5] }}
                            transition={{ repeat: Infinity, duration: character.mood === 'angry' ? 0.5 : 2 }}
                            className="absolute -right-3 top-3 w-6 h-2 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full border border-cyan-500/30"
                        />

                        {/* Forehead protector symbol */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-cyan-500/20 rounded-sm flex items-center justify-center">
                            <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                        </div>
                    </div>

                    {/* Body with armor details */}
                    <div className="w-12 h-12 bg-gradient-to-b from-slate-800 to-slate-950 rounded-b-3xl border-x-2 border-b-2 border-cyan-500/30 mt-[-3px] relative shadow-lg">
                        {/* Chest armor */}
                        <div className="absolute top-3 w-full h-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y border-cyan-500/20">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3 h-full bg-cyan-500/30 border-x border-cyan-500/40" />
                        </div>

                        {/* Arms with motion */}
                        <motion.div
                            animate={{ rotate: character.isWatering ? -30 : character.mood === 'walking' ? [-15, 15, -15] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.6 }}
                            className="absolute -left-3 top-2 w-4 h-8 bg-gradient-to-b from-slate-800 to-slate-950 border-l-2 border-cyan-500/20 rounded-full shadow-md"
                        />
                        <motion.div
                            animate={{ rotate: character.mood === 'striking' ? 90 : character.mood === 'walking' ? [15, -15, 15] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.6 }}
                            className="absolute -right-3 top-2 w-4 h-8 bg-gradient-to-b from-slate-800 to-slate-950 border-r-2 border-cyan-500/20 rounded-full shadow-md"
                        />
                    </div>

                    {/* Cape with flowing motion */}
                    <motion.div
                        animate={{
                            skewX: character.mood === 'walking' ? [-10, 10, -10] : [-5, 5, -5],
                            y: [0, 3, 0],
                            opacity: [0.7, 0.9, 0.7]
                        }}
                        transition={{ repeat: Infinity, duration: character.mood === 'walking' ? 0.5 : 3 }}
                        className="absolute bottom-6 -z-10 w-16 h-20 bg-gradient-to-b from-cyan-900/60 via-slate-900/50 to-transparent rounded-full blur-sm"
                    />
                </div>

                {/* Aura effects */}
                <div className={cn(
                    "absolute inset-0 -z-20 rounded-full blur-3xl opacity-30 transition-all duration-700",
                    character.mood === 'angry' ? "bg-red-500 scale-[2]" :
                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-500 scale-150" :
                            character.mood === 'striking' ? "bg-cyan-500 scale-[2]" :
                                character.mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-cyan-500/50"
                )} />

                {/* Hover glow */}
                <div className="absolute inset-0 -z-10 rounded-full bg-cyan-500/20 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-150 transition-all duration-300" />
            </motion.div>
        </div>
    );
}

// Enhanced Kunoichi Character (similar structure with pink theme and alert eyes)
function KunoichiCharacter({ character, charRef, onClick, onPet, onTalk }: {
    character: Character;
    charRef: React.RefObject<HTMLDivElement>;
    onClick: () => void;
    onPet: () => void;
    onTalk: () => void;
}) {
    const getBubblePosition = () => {
        const screenWidth = window.innerWidth;
        const charX = character.position.x;
        if (charX > screenWidth - 200) return { left: 'auto', right: '100%', marginRight: '10px', whiteSpace: 'nowrap' as const };
        if (charX < 200) return { left: '100%', right: 'auto', marginLeft: '10px', whiteSpace: 'nowrap' as const };
        return { left: '50%', transform: 'translateX(-50%)', top: '-70px', whiteSpace: 'nowrap' as const };
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none transition-all duration-700 ease-out"
            style={{ left: character.position.x, top: character.position.y }}
        >
            <AnimatePresence>
                {character.isTeleporting && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 2 }}
                        exit={{ opacity: 0, scale: 3 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        <Sparkles className="w-16 h-16 text-pink-400/40 blur-md" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                ref={charRef}
                animate={{
                    scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.8 : 1.2),
                    y: character.mood === 'idle' || character.mood === 'walking' ? [0, -5, 0] : 0,
                }}
                transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="relative w-24 h-28 pointer-events-auto cursor-pointer group"
                onClick={onClick}
                whileHover={{ scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.85 : 1.25) }}
            >
                {/* Interaction Menu */}
                <AnimatePresence>
                    {character.showInteractionMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border-2 border-pink-500/30 rounded-2xl p-2 shadow-2xl z-50 flex gap-2"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onPet(); }}
                                className="px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-xl text-xs text-pink-300 font-bold flex items-center gap-1 transition-all hover:scale-105"
                            >
                                <Hand className="w-3 h-3" /> Pet
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onTalk(); }}
                                className="px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-xl text-xs text-pink-300 font-bold flex items-center gap-1 transition-all hover:scale-105"
                            >
                                <MessageCircle className="w-3 h-3" /> Talk
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Thought Bubble */}
                <AnimatePresence>
                    {character.currentThought && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none whitespace-nowrap z-50"
                            style={getBubblePosition()}
                        >
                            <div className={cn(
                                "relative px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-2",
                                character.mood === 'angry' ? "bg-red-100 border-red-600" :
                                    character.mood === 'love' || character.mood === 'happy' ? "bg-pink-100 border-pink-500" :
                                        "bg-white border-slate-900"
                            )}>
                                <p className={cn(
                                    "text-[11px] font-bold",
                                    character.mood === 'angry' ? "text-red-900" :
                                        character.mood === 'love' || character.mood === 'happy' ? "text-pink-700" :
                                            "text-slate-900"
                                )}>{character.currentThought}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Enhanced SWORD */}
                <AnimatePresence>
                    {character.mood === 'striking' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotate: 90 }}
                            animate={{ opacity: 1, x: -30, rotate: -45 }}
                            exit={{ opacity: 0, x: -50, rotate: -90 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 z-30"
                        >
                            <Sword className="w-12 h-12 text-pink-200 drop-shadow-[0_0_20px_rgba(236,72,153,1)]" strokeWidth={2.5} />
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 2, opacity: [0, 1, 0] }}
                                transition={{ duration: 0.4 }}
                                className="absolute top-1/2 right-0 h-1 w-20 bg-gradient-to-l from-transparent via-pink-400 to-transparent blur-sm"
                            />
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        rotate: [0, 180],
                                        x: [0, -(i - 1) * 20],
                                        y: [0, (i - 1) * 15]
                                    }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                >
                                    <Sparkles className="w-4 h-4 text-pink-400" />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Watering */}
                <AnimatePresence>
                    {character.isWatering && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 12 }}
                            exit={{ opacity: 0 }}
                            className="absolute -right-12 top-6 z-20"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-teal-500/30 border-2 border-teal-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                                    <Droplets className="w-6 h-6 text-teal-400 animate-bounce" />
                                </div>
                                {[...Array(4)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, 25], opacity: [0, 1, 0], x: [0, 12] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                                        className="absolute top-10 left-5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_4px_rgba(20,184,166,1)]"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Love Hearts */}
                <AnimatePresence>
                    {(character.mood === 'love' || character.mood === 'happy') && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0, y: 0 }}
                            animate={{ opacity: 1, scale: 1, y: -25 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-8 left-0 z-20"
                        >
                            <Heart className="w-7 h-7 text-pink-500 fill-pink-500 animate-pulse drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Enhanced Kunoichi Character Design with ALERT EYES */}
                <div className="relative w-full h-full flex flex-col items-center">
                    {/* Head with cherry blossom theme */}
                    <div className="relative w-14 h-14 bg-gradient-to-br from-pink-900 to-pink-950 rounded-full border-2 border-pink-500/40 overflow-hidden shadow-2xl">
                        {/* Mask */}
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-b from-pink-800 to-pink-950 border-t-2 border-pink-500/30" />

                        {/* Cherry blossom petal on forehead */}
                        <div className="absolute top-2 right-2 w-3 h-3">
                            <Sparkles className="w-full h-full text-pink-400" />
                        </div>

                        {/* ALERT ROUNDED EYES - NOT SLEEPY! */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1.5">
                            {/* Left Eye */}
                            <motion.div
                                animate={{
                                    scaleY: [1, 1, 0.05, 1],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 4,
                                    repeatDelay: 3
                                }}
                                className="w-4 h-4 rounded-full bg-white border border-pink-800 relative shadow-inner"
                            >
                                <div className={cn(
                                    "absolute inset-1 rounded-full transition-colors",
                                    character.mood === 'angry' ? "bg-red-500" :
                                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-400" :
                                            "bg-pink-400"
                                )}>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
                                </div>
                            </motion.div>

                            {/* Right Eye */}
                            <motion.div
                                animate={{
                                    scaleY: [1, 1, 0.05, 1],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 4,
                                    delay: 0.1,
                                    repeatDelay: 3
                                }}
                                className="w-4 h-4 rounded-full bg-white border border-pink-800 relative shadow-inner"
                            >
                                <div className={cn(
                                    "absolute inset-1 rounded-full transition-colors",
                                    character.mood === 'angry' ? "bg-red-500" :
                                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-400" :
                                            "bg-pink-400"
                                )}>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Hair ribbon */}
                        <motion.div
                            animate={{ rotate: character.mood === 'angry' ? [-10, 10, -10] : [-5, 5, -5] }}
                            transition={{ repeat: Infinity, duration: character.mood === 'angry' ? 0.5 : 2 }}
                            className="absolute -left-3 top-3 w-6 h-2 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full border border-pink-400/50 shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                        />

                        {/* Hair ornament */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rounded-full border border-pink-300 shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
                    </div>

                    {/* Body with kimono-style design */}
                    <div className="w-12 h-12 bg-gradient-to-b from-pink-900 to-pink-950 rounded-b-3xl border-x-2 border-b-2 border-pink-500/40 mt-[-3px] relative shadow-lg">
                        {/* Kimono collar */}
                        <div className="absolute top-3 w-full h-3 bg-gradient-to-r from-pink-800 via-pink-700 to-pink-800 border-y border-pink-500/30">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3 h-full bg-pink-500/30 border-x border-pink-500/40" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-pink-400/50" />
                        </div>

                        {/* Arms */}
                        <motion.div
                            animate={{ rotate: character.isWatering ? 30 : character.mood === 'walking' ? [-15, 15, -15] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.6 }}
                            className="absolute -left-3 top-2 w-4 h-8 bg-gradient-to-b from-pink-900 to-pink-950 border-l-2 border-pink-500/20 rounded-full shadow-md"
                        />
                        <motion.div
                            animate={{ rotate: character.mood === 'striking' ? -90 : character.mood === 'walking' ? [15, -15, 15] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.6 }}
                            className="absolute -right-3 top-2 w-4 h-8 bg-gradient-to-b from-pink-900 to-pink-950 border-r-2 border-pink-500/20 rounded-full shadow-md"
                        />
                    </div>

                    {/* Flowing kimono with sakura petals */}
                    <motion.div
                        animate={{
                            skewX: character.mood === 'walking' ? [-10, 10, -10] : [-5, 5, -5],
                            y: [0, 3, 0],
                            opacity: [0.7, 0.9, 0.7]
                        }}
                        transition={{ repeat: Infinity, duration: character.mood === 'walking' ? 0.5 : 3 }}
                        className="absolute bottom-6 -z-10 w-16 h-20 bg-gradient-to-b from-pink-900/60 via-pink-950/50 to-transparent rounded-full blur-sm"
                    >
                        {/* Floating cherry blossom petals */}
                        {[...Array(2)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    y: [0, 10, 0],
                                    x: [0, 5, 0],
                                    rotate: [0, 180, 360]
                                }}
                                transition={{ repeat: Infinity, duration: 4, delay: i * 2 }}
                                className="absolute top-2 left-4 w-1 h-1 bg-pink-400 rounded-full opacity-60"
                                style={{ left: `${i * 50}%` }}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Aura */}
                <div className={cn(
                    "absolute inset-0 -z-20 rounded-full blur-3xl opacity-30 transition-all duration-700",
                    character.mood === 'angry' ? "bg-red-500 scale-[2]" :
                        character.mood === 'love' || character.mood === 'happy' ? "bg-pink-500 scale-150" :
                            character.mood === 'striking' ? "bg-pink-500 scale-[2]" :
                                character.mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-pink-500/50"
                )} />

                {/* Hover glow */}
                <div className="absolute inset-0 -z-10 rounded-full bg-pink-500/20 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-150 transition-all duration-300" />
            </motion.div>
        </div>
    );
}
