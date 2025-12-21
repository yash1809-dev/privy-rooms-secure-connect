import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Zap, Cloud, Sword, Droplets, Heart, Music } from "lucide-react";

interface NeuralCoupleProps {
    status?: 'idle' | 'focusing' | 'excited' | 'greeting';
}

type Mood = 'idle' | 'focusing' | 'excited' | 'striking' | 'angry' | 'walking' | 'love' | 'helping';

interface Character {
    id: string;
    name: string;
    gender: 'male' | 'female';
    position: { x: number; y: number };
    mood: Mood;
    currentThought: string | null;
    isWatering: boolean;
    isTeleporting: boolean;
    activity: string | null;
}

const NINJA_INSIGHTS = [
    "Shadow step initialized.",
    "Training never stops.",
    "Observing user patterns...",
    "Silent execution. Perfect form.",
];

const KUNOICHI_INSIGHTS = [
    "Grace and precision combined.",
    "Supporting you always.",
    "Harmony in motion.",
    "Every action has purpose.",
];

const ANGRY_INSIGHTS = [
    "Hey! I was working on that!",
    "Where did it go?!",
    "Don't interrupt me!",
    "You made me lose focus!",
];

const CONVERSATIONS = [
    { ninja: "The plant is looking good today.", kunoichi: "Your watering technique is perfect!" },
    { ninja: "How's your patrol going?", kunoichi: "All clear! You focus on the mission." },
    { ninja: "Need any assistance?", kunoichi: "I'm handling it, but thank you!" },
    { kunoichi: "You're working hard today.", ninja: "As always, can't let the user down." },
    { kunoichi: "Remember to take breaks.", ninja: "You're right, balance is key." },
    { ninja: "That was a perfect strike!", kunoichi: "I learned from the best!" },
];

const LOVE_MOMENTS = [
    { both: "💕", action: "looking at each other" },
    { ninja: "You're amazing.", kunoichi: "Together we're unstoppable." },
    { kunoichi: "Dance with me?", ninja: "Always." },
];

const ACTIVITIES = [
    "watering the plant",
    "patrolling",
    "training",
    "meditating",
    "dancing",
    "protecting buttons",
];

export function NeuralCouple({ status = 'idle' }: NeuralCoupleProps) {
    const [ninja, setNinja] = useState<Character>({
        id: 'ninja',
        name: 'Shadow',
        gender: 'male',
        position: { x: window.innerWidth - 120, y: window.innerHeight - 150 },
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        activity: null,
    });

    const [kunoichi, setKunoichi] = useState<Character>({
        id: 'kunoichi',
        name: 'Sakura',
        gender: 'female',
        position: { x: window.innerWidth - 220, y: window.innerHeight - 150 },
        mood: 'idle',
        currentThought: null,
        isWatering: false,
        isTeleporting: false,
        activity: null,
    });

    const [isPlantVisible, setIsPlantVisible] = useState(true);
    const [conversationActive, setConversationActive] = useState(false);
    const [loveMoment, setLoveMoment] = useState(false);
    const wasWateringRef = useRef({ ninja: false, kunoichi: false });
    const ninjaRef = useRef<HTMLDivElement>(null);
    const kunoichiRef = useRef<HTMLDivElement>(null);

    // Responsive Home Positions
    useEffect(() => {
        const updateHome = () => {
            const isMobile = window.innerWidth < 768;
            const spacing = isMobile ? 60 : 100;
            const baseY = window.innerHeight - (isMobile ? 100 : 150);

            setNinja(prev => ({
                ...prev,
                position: prev.mood === 'idle' ? { x: window.innerWidth - spacing, y: baseY } : prev.position
            }));

            setKunoichi(prev => ({
                ...prev,
                position: prev.mood === 'idle' ? { x: window.innerWidth - spacing * 2, y: baseY } : prev.position
            }));
        };

        updateHome();
        window.addEventListener('resize', updateHome);
        return () => window.removeEventListener('resize', updateHome);
    }, []);

    // PLANT VISIBILITY DETECTION
    useEffect(() => {
        const plantObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const wasVisible = isPlantVisible;
                    const nowVisible = entry.isIntersecting;
                    setIsPlantVisible(nowVisible);

                    // GET ANGRY IF PLANT DISAPPEARS WHILE WATERING
                    if (wasVisible && !nowVisible) {
                        if (wasWateringRef.current.ninja) {
                            setNinja(prev => ({
                                ...prev,
                                mood: 'angry',
                                currentThought: ANGRY_INSIGHTS[Math.floor(Math.random() * ANGRY_INSIGHTS.length)],
                                isWatering: false,
                            }));

                            // Kunoichi comforts him
                            setTimeout(() => {
                                setKunoichi(prev => ({
                                    ...prev,
                                    currentThought: "It's okay, we'll find it.",
                                    mood: 'love',
                                }));
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
                                currentThought: ANGRY_INSIGHTS[Math.floor(Math.random() * ANGRY_INSIGHTS.length)],
                                isWatering: false,
                            }));

                            // Ninja comforts her
                            setTimeout(() => {
                                setNinja(prev => ({
                                    ...prev,
                                    currentThought: "Don't worry, I'm here.",
                                    mood: 'love',
                                }));
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

    // Track watering state
    useEffect(() => {
        wasWateringRef.current.ninja = ninja.isWatering;
        wasWateringRef.current.kunoichi = kunoichi.isWatering;
    }, [ninja.isWatering, kunoichi.isWatering]);

    // Update mood based on prop
    useEffect(() => {
        if (status === 'focusing') {
            const plant = document.getElementById('focus-plant-container');
            if (plant && isPlantVisible) {
                const rect = plant.getBoundingClientRect();
                // Decide who waters based on random
                const whoWaters = Math.random() > 0.5 ? 'ninja' : 'kunoichi';

                if (whoWaters === 'ninja') {
                    walkCharacter('ninja', rect.left + rect.width / 2 + 40, rect.top + rect.height / 2, true);
                    setKunoichi(prev => ({ ...prev, currentThought: "You got this!", mood: 'love' }));
                    setTimeout(() => setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                } else {
                    walkCharacter('kunoichi', rect.left + rect.width / 2 - 40, rect.top + rect.height / 2, true);
                    setNinja(prev => ({ ...prev, currentThought: "Perfect technique!", mood: 'love' }));
                    setTimeout(() => setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 2000);
                }
            }
        } else if (status === 'excited') {
            setNinja(prev => ({ ...prev, mood: 'excited' }));
            setKunoichi(prev => ({ ...prev, mood: 'excited' }));
            setTimeout(() => {
                setNinja(prev => ({ ...prev, mood: 'idle' }));
                setKunoichi(prev => ({ ...prev, mood: 'idle' }));
            }, 2000);
        }
    }, [status, isPlantVisible]);

    const walkCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, startWatering = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;

        setter(prev => ({ ...prev, mood: 'walking', position: { x: newX, y: newY } }));

        setTimeout(() => {
            setter(prev => ({
                ...prev,
                isWatering: startWatering,
                mood: startWatering ? 'focusing' : 'idle',
            }));
        }, 800);
    }, []);

    const teleportCharacter = useCallback((charId: 'ninja' | 'kunoichi', newX: number, newY: number, shouldStrike = false) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;

        setter(prev => ({ ...prev, isTeleporting: true }));

        setTimeout(() => {
            setter(prev => ({
                ...prev,
                position: { x: newX, y: newY },
                mood: shouldStrike ? 'striking' : prev.mood,
            }));

            setTimeout(() => {
                setter(prev => ({ ...prev, isTeleporting: false }));
                if (shouldStrike) {
                    setTimeout(() => {
                        setter(prev => ({ ...prev, mood: 'idle' }));
                    }, 800);
                }
            }, 300);
        }, 300);
    }, []);

    // Global Click Interaction - They take turns
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInteraction = target.closest('button') || target.closest('a') || target.tagName === 'INPUT' || target.closest('[role="button"]');

            if (isInteraction && !ninjaRef.current?.contains(target) && !kunoichiRef.current?.contains(target)) {
                const rect = (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target).getBoundingClientRect();

                // They take turns protecting
                const whoStrikes = Math.random() > 0.5 ? 'ninja' : 'kunoichi';
                teleportCharacter(whoStrikes, rect.left - 20, rect.top - 20, true);

                // Partner cheers
                const partner = whoStrikes === 'ninja' ? 'kunoichi' : 'ninja';
                const partnerSetter = partner === 'ninja' ? setNinja : setKunoichi;
                partnerSetter(prev => ({ ...prev, currentThought: "Nice strike!", mood: 'love' }));
                setTimeout(() => {
                    partnerSetter(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                }, 1500);
            }
        };

        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [teleportCharacter]);

    // CONVERSATIONS between them
    useEffect(() => {
        const startConversation = () => {
            if (conversationActive || loveMoment) return;

            setConversationActive(true);
            const convo = CONVERSATIONS[Math.floor(Math.random() * CONVERSATIONS.length)];

            if (convo.ninja) {
                setNinja(prev => ({ ...prev, currentThought: convo.ninja!, mood: 'love' }));
                setTimeout(() => {
                    setKunoichi(prev => ({ ...prev, currentThought: convo.kunoichi!, mood: 'love' }));
                }, 2000);

                setTimeout(() => {
                    setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setConversationActive(false);
                }, 5000);
            } else {
                setKunoichi(prev => ({ ...prev, currentThought: convo.kunoichi!, mood: 'love' }));
                setTimeout(() => {
                    setNinja(prev => ({ ...prev, currentThought: convo.ninja!, mood: 'love' }));
                }, 2000);

                setTimeout(() => {
                    setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setConversationActive(false);
                }, 5000);
            }
        };

        const interval = setInterval(startConversation, 25000 + Math.random() * 15000);
        return () => clearInterval(interval);
    }, [conversationActive, loveMoment]);

    // LOVE MOMENTS
    useEffect(() => {
        const loveMom = () => {
            if (conversationActive || loveMoment) return;

            setLoveMoment(true);
            const moment = LOVE_MOMENTS[Math.floor(Math.random() * LOVE_MOMENTS.length)];

            if (moment.both) {
                setNinja(prev => ({ ...prev, currentThought: moment.both, mood: 'love' }));
                setKunoichi(prev => ({ ...prev, currentThought: moment.both, mood: 'love' }));
            } else {
                setNinja(prev => ({ ...prev, currentThought: moment.ninja, mood: 'love' }));
                setTimeout(() => {
                    setKunoichi(prev => ({ ...prev, currentThought: moment.kunoichi, mood: 'love' }));
                }, 1500);
            }

            setTimeout(() => {
                setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                setLoveMoment(false);
            }, 4000);
        };

        const interval = setInterval(loveMom, 40000 + Math.random() * 20000);
        return () => clearInterval(interval);
    }, [conversationActive, loveMoment]);

    // Autonomous Activities
    useEffect(() => {
        const assignActivity = () => {
            if (ninja.mood !== 'idle' && ninja.mood !== 'walking') return;

            const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
            const margin = 100;
            const randomX = margin + Math.random() * (window.innerWidth - margin * 2);
            const randomY = margin + Math.random() * (window.innerHeight - margin * 2);

            walkCharacter('ninja', randomX, randomY);
            setNinja(prev => ({ ...prev, activity }));

            if (Math.random() > 0.7) {
                setTimeout(() => {
                    setNinja(prev => ({
                        ...prev,
                        currentThought: NINJA_INSIGHTS[Math.floor(Math.random() * NINJA_INSIGHTS.length)]
                    }));
                    setTimeout(() => setNinja(prev => ({ ...prev, currentThought: null })), 3000);
                }, 1000);
            }
        };

        const interval = setInterval(assignActivity, 12000 + Math.random() * 8000);
        return () => clearInterval(interval);
    }, [ninja.mood, walkCharacter]);

    useEffect(() => {
        const assignActivity = () => {
            if (kunoichi.mood !== 'idle' && kunoichi.mood !== 'walking') return;

            const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
            const margin = 100;
            const randomX = margin + Math.random() * (window.innerWidth - margin * 2);
            const randomY = margin + Math.random() * (window.innerHeight - margin * 2);

            walkCharacter('kunoichi', randomX, randomY);
            setKunoichi(prev => ({ ...prev, activity }));

            if (Math.random() > 0.7) {
                setTimeout(() => {
                    setKunoichi(prev => ({
                        ...prev,
                        currentThought: KUNOICHI_INSIGHTS[Math.floor(Math.random() * KUNOICHI_INSIGHTS.length)]
                    }));
                    setTimeout(() => setKunoichi(prev => ({ ...prev, currentThought: null })), 3000);
                }, 1000);
            }
        };

        const interval = setInterval(assignActivity, 12000 + Math.random() * 8000);
        return () => clearInterval(interval);
    }, [kunoichi.mood, walkCharacter]);

    return (
        <>
            <ShinobiCharacter character={ninja} charRef={ninjaRef} />
            <KunoichiCharacter character={kunoichi} charRef={kunoichiRef} />
        </>
    );
}

// NINJA CHARACTER
function ShinobiCharacter({ character, charRef }: { character: Character; charRef: React.RefObject<HTMLDivElement> }) {
    const getBubblePosition = () => {
        const screenWidth = window.innerWidth;
        const charX = character.position.x;

        if (charX > screenWidth - 200) {
            return { left: 'auto', right: '100%', marginRight: '10px', whiteSpace: 'nowrap' as const };
        }
        if (charX < 200) {
            return { left: '100%', right: 'auto', marginLeft: '10px', whiteSpace: 'nowrap' as const };
        }
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
                    scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.7 : 1),
                    y: character.mood === 'idle' || character.mood === 'walking' ? [0, -5, 0] : 0,
                }}
                transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="relative w-20 h-24 pointer-events-auto cursor-help group"
            >
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
                                    character.mood === 'love' ? "bg-pink-100 border-pink-500" :
                                        "bg-white border-slate-900"
                            )}>
                                <p className={cn(
                                    "text-[11px] font-bold",
                                    character.mood === 'angry' ? "text-red-900" :
                                        character.mood === 'love' ? "text-pink-700" :
                                            "text-slate-900"
                                )}>{character.currentThought}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SWORD ANIMATION - FIXED */}
                <AnimatePresence>
                    {character.mood === 'striking' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, rotate: -90, scale: 0, x: 0 }}
                            animate={{ opacity: 1, rotate: 45, scale: 1.5, x: character.position.x > window.innerWidth / 2 ? -30 : 30 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
                        >
                            <Sword className="w-10 h-10 text-slate-200 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                            <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: [0, 1, 0], scaleX: [0, 2, 0] }}
                                transition={{ duration: 0.5 }}
                                className="absolute top-4 left-0 w-12 h-0.5 bg-white blur-sm"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* WATERING ANIMATION */}
                <AnimatePresence>
                    {character.isWatering && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: -10 }}
                            exit={{ opacity: 0 }}
                            className="absolute -left-10 top-4 z-20"
                        >
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                                    <Droplets className="w-5 h-5 text-teal-400 animate-bounce" />
                                </div>
                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, 20], opacity: [0, 1, 0], x: [0, -10] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                                        className="absolute top-8 right-4 w-1 h-1 bg-teal-400 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* LOVE ANIMATION */}
                <AnimatePresence>
                    {character.mood === 'love' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1, y: -20 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 right-0 z-20"
                        >
                            <Heart className="w-6 h-6 text-pink-500 fill-pink-500 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* NINJA CHARACTER */}
                <div className="relative w-full h-full flex flex-col items-center">
                    <div className="relative w-12 h-12 bg-slate-900 rounded-full border border-white/10 overflow-hidden shadow-2xl">
                        <div className="absolute bottom-0 w-full h-1/2 bg-slate-950 border-t border-white/5" />
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1">
                            <motion.div
                                animate={{ scaleY: [1, 1, 0.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className={cn(
                                    "w-2 h-0.5",
                                    character.mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                                        character.mood === 'love' ? "bg-pink-500 shadow-[0_0_5px_pink]" :
                                            character.mood === 'striking' ? "bg-red-500 shadow-red-500" :
                                                "bg-teal-400 shadow-[0_0_5px_teal]"
                                )}
                            />
                            <motion.div
                                animate={{ scaleY: [1, 1, 0.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4, delay: 0.1 }}
                                className={cn(
                                    "w-2 h-0.5",
                                    character.mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                                        character.mood === 'love' ? "bg-pink-500 shadow-[0_0_5px_pink]" :
                                            character.mood === 'striking' ? "bg-red-500 shadow-red-500" :
                                                "bg-teal-400 shadow-[0_0_5px_teal]"
                                )}
                            />
                        </div>
                        <motion.div
                            animate={{ rotate: character.mood === 'angry' ? [-10, 10, -10] : [-5, 5, -5] }}
                            transition={{ repeat: Infinity, duration: character.mood === 'angry' ? 0.5 : 2 }}
                            className="absolute -right-2 top-2 w-4 h-1 bg-slate-800 rounded-full"
                        />
                    </div>

                    <div className="w-10 h-10 bg-slate-900 rounded-b-2xl border-x border-b border-white/10 mt-[-2px] relative">
                        <div className="absolute top-2 w-full h-2 bg-slate-950 border-y border-white/5">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-teal-500/40" />
                        </div>
                        <motion.div
                            animate={{ rotate: character.isWatering ? -30 : character.mood === 'walking' ? [-10, 10, -10] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
                            className="absolute -left-2 top-1 w-3 h-6 bg-slate-900 border-l border-white/5 rounded-full"
                        />
                        <motion.div
                            animate={{ rotate: character.mood === 'striking' ? 90 : character.mood === 'walking' ? [10, -10, 10] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
                            className="absolute -right-2 top-1 w-3 h-6 bg-slate-900 border-r border-white/5 rounded-full"
                        />
                    </div>

                    <motion.div
                        animate={{
                            skewX: character.mood === 'walking' ? [-10, 10, -10] : [-5, 5, -5],
                            y: [0, 2, 0]
                        }}
                        transition={{ repeat: Infinity, duration: character.mood === 'walking' ? 0.6 : 4 }}
                        className="absolute bottom-4 -z-10 w-14 h-16 bg-gradient-to-b from-slate-900 to-transparent rounded-full opacity-60 blur-[2px]"
                    />
                </div>

                <div className={cn(
                    "absolute inset-0 -z-20 rounded-full blur-2xl opacity-20 transition-all duration-700",
                    character.mood === 'angry' ? "bg-red-500 scale-150" :
                        character.mood === 'love' ? "bg-pink-500 scale-150" :
                            character.mood === 'striking' ? "bg-red-500 scale-150" :
                                character.mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-indigo-500"
                )} />
            </motion.div>
        </div>
    );
}

// KUNOICHI CHARACTER (Female Ninja)
function KunoichiCharacter({ character, charRef }: { character: Character; charRef: React.RefObject<HTMLDivElement> }) {
    const getBubblePosition = () => {
        const screenWidth = window.innerWidth;
        const charX = character.position.x;

        if (charX > screenWidth - 200) {
            return { left: 'auto', right: '100%', marginRight: '10px', whiteSpace: 'nowrap' as const };
        }
        if (charX < 200) {
            return { left: '100%', right: 'auto', marginLeft: '10px', whiteSpace: 'nowrap' as const };
        }
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
                        <Sparkles className="w-16 h-16 text-pink-400/30 blur-md" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                ref={charRef}
                animate={{
                    scale: character.isTeleporting ? 0 : (window.innerWidth < 768 ? 0.7 : 1),
                    y: character.mood === 'idle' || character.mood === 'walking' ? [0, -5, 0] : 0,
                }}
                transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="relative w-20 h-24 pointer-events-auto cursor-help group"
            >
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
                                    character.mood === 'love' ? "bg-pink-100 border-pink-500" :
                                        "bg-white border-slate-900"
                            )}>
                                <p className={cn(
                                    "text-[11px] font-bold",
                                    character.mood === 'angry' ? "text-red-900" :
                                        character.mood === 'love' ? "text-pink-700" :
                                            "text-slate-900"
                                )}>{character.currentThought}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SWORD ANIMATION - FIXED */}
                <AnimatePresence>
                    {character.mood === 'striking' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, rotate: -90, scale: 0, x: 0 }}
                            animate={{ opacity: 1, rotate: 45, scale: 1.5, x: character.position.x > window.innerWidth / 2 ? -30 : 30 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
                        >
                            <Sword className="w-10 h-10 text-pink-300 drop-shadow-[0_0_12px_rgba(255,192,203,0.8)]" />
                            <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: [0, 1, 0], scaleX: [0, 2, 0] }}
                                transition={{ duration: 0.5 }}
                                className="absolute top-4 left-0 w-12 h-0.5 bg-pink-400 blur-sm"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* WATERING ANIMATION */}
                <AnimatePresence>
                    {character.isWatering && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 10 }}
                            exit={{ opacity: 0 }}
                            className="absolute -right-10 top-4 z-20"
                        >
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                                    <Droplets className="w-5 h-5 text-teal-400 animate-bounce" />
                                </div>
                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, 20], opacity: [0, 1, 0], x: [0, 10] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                                        className="absolute top-8 left-4 w-1 h-1 bg-teal-400 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* LOVE ANIMATION */}
                <AnimatePresence>
                    {character.mood === 'love' && !character.isTeleporting && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1, y: -20 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 left-0 z-20"
                        >
                            <Heart className="w-6 h-6 text-pink-500 fill-pink-500 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* KUNOICHI CHARACTER */}
                <div className="relative w-full h-full flex flex-col items-center">
                    <div className="relative w-12 h-12 bg-pink-950 rounded-full border border-pink-500/20 overflow-hidden shadow-2xl">
                        <div className="absolute bottom-0 w-full h-1/2 bg-pink-900 border-t border-pink-500/10" />
                        {/* Flower accent */}
                        <div className="absolute top-1 right-1 w-3 h-3 bg-pink-500 rounded-full opacity-60" />
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1">
                            <motion.div
                                animate={{ scaleY: [1, 1, 0.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className={cn(
                                    "w-2 h-0.5",
                                    character.mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                                        character.mood === 'love' ? "bg-pink-400 shadow-[0_0_5px_pink]" :
                                            character.mood === 'striking' ? "bg-pink-500 shadow-pink-500" :
                                                "bg-pink-300 shadow-[0_0_5px_pink]"
                                )}
                            />
                            <motion.div
                                animate={{ scaleY: [1, 1, 0.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4, delay: 0.1 }}
                                className={cn(
                                    "w-2 h-0.5",
                                    character.mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                                        character.mood === 'love' ? "bg-pink-400 shadow-[0_0_5px_pink]" :
                                            character.mood === 'striking' ? "bg-pink-500 shadow-pink-500" :
                                                "bg-pink-300 shadow-[0_0_5px_pink]"
                                )}
                            />
                        </div>
                        {/* Hair ribbon */}
                        <motion.div
                            animate={{ rotate: character.mood === 'angry' ? [-10, 10, -10] : [-5, 5, -5] }}
                            transition={{ repeat: Infinity, duration: character.mood === 'angry' ? 0.5 : 2 }}
                            className="absolute -left-2 top-2 w-4 h-1 bg-pink-500 rounded-full"
                        />
                    </div>

                    <div className="w-10 h-10 bg-pink-950 rounded-b-2xl border-x border-b border-pink-500/20 mt-[-2px] relative">
                        <div className="absolute top-2 w-full h-2 bg-pink-900 border-y border-pink-500/10">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-pink-500/40" />
                        </div>
                        <motion.div
                            animate={{ rotate: character.isWatering ? 30 : character.mood === 'walking' ? [-10, 10, -10] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
                            className="absolute -left-2 top-1 w-3 h-6 bg-pink-950 border-l border-pink-500/10 rounded-full"
                        />
                        <motion.div
                            animate={{ rotate: character.mood === 'striking' ? -90 : character.mood === 'walking' ? [10, -10, 10] : 0 }}
                            transition={{ repeat: character.mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
                            className="absolute -right-2 top-1 w-3 h-6 bg-pink-950 border-r border-pink-500/10 rounded-full"
                        />
                    </div>

                    <motion.div
                        animate={{
                            skewX: character.mood === 'walking' ? [-10, 10, -10] : [-5, 5, -5],
                            y: [0, 2, 0]
                        }}
                        transition={{ repeat: Infinity, duration: character.mood === 'walking' ? 0.6 : 4 }}
                        className="absolute bottom-4 -z-10 w-14 h-16 bg-gradient-to-b from-pink-900 to-transparent rounded-full opacity-60 blur-[2px]"
                    />
                </div>

                <div className={cn(
                    "absolute inset-0 -z-20 rounded-full blur-2xl opacity-20 transition-all duration-700",
                    character.mood === 'angry' ? "bg-red-500 scale-150" :
                        character.mood === 'love' ? "bg-pink-500 scale-150" :
                            character.mood === 'striking' ? "bg-pink-500 scale-150" :
                                character.mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-pink-500"
                )} />
            </motion.div>
        </div>
    );
}
