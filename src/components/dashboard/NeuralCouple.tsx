import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Heart, MessageCircle, Eye, Lightbulb, HelpCircle, Gamepad2, Scissors, Hand, Circle } from "lucide-react";
import { useStoryProgress } from "@/contexts/StoryProgressProvider";
import { toast } from "sonner";

interface NeuralCoupleProps {
    status?: 'idle' | 'focusing' | 'excited' | 'greeting';
    onPositionChange?: (ninja: { x: number; y: number }, kunoichi: { x: number; y: number }) => void;
}

type Mood = 'idle' | 'focusing' | 'walking' | 'love' | 'happy' | 'talking' | 'hiding' | 'seeking' | 'learning' | 'playing' | 'following';

interface Character {
    id: string;
    name: string;
    position: { x: number; y: number };
    mood: Mood;
    currentThought: string | null;
    showInteractionMenu: boolean;
    isDragging: boolean;
    isHidden: boolean;
}

// Conversation memory to avoid repetition
const conversationMemory: string[] = [];
const MAX_MEMORY = 30;

const MARGIN = 40;
const IDLE_TALK_INTERVAL = 15000;
const GAME_INTERVAL = 40000; // Hide/Seek, RPS, or Follow
const LEARNING_INTERVAL = 60000;

// AI Service with memory
async function generateAIDialogue(
    character: 'shadow' | 'sakura',
    context: string,
    relationshipLevel: number,
    avoidPhrases: string[]
): Promise<string | null> {
    const shadowPrompt = `You are Shadow (影/Kage), a thoughtful Japanese man deeply in love with Sakura. You're protective, romantic, and caring. Modern streetwear style. NEVER repeat these: ${avoidPhrases.slice(-10).join('; ')}. Keep response under 12 words. Rel level: ${relationshipLevel}/100.`;

    const sakuraPrompt = `You are Sakura (桜), a warm elegant Japanese woman in a beautiful kimono. You love Shadow and the user. Cheerful, encouraging, playful. NEVER repeat these: ${avoidPhrases.slice(-10).join('; ')}. Keep response under 12 words. Rel level: ${relationshipLevel}/100.`;

    try {
        const response = await fetch("https://api.llm7.io/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: character === 'shadow' ? shadowPrompt : sakuraPrompt },
                    { role: "user", content: context }
                ],
                max_tokens: 40,
                temperature: 0.95
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || null;

        if (reply && !avoidPhrases.includes(reply)) {
            conversationMemory.push(reply);
            if (conversationMemory.length > MAX_MEMORY) conversationMemory.shift();
        }
        return reply;
    } catch {
        return null;
    }
}

export function NeuralCouple({ status = 'idle', onPositionChange }: NeuralCoupleProps) {
    const { increaseRelationship, incrementQuestProgress, relationshipLevel } = useStoryProgress();

    const getInitialPos = (offsetX: number) => ({
        x: Math.min(window.innerWidth - 80, Math.max(MARGIN, window.innerWidth - offsetX)),
        y: Math.min(window.innerHeight - 150, Math.max(MARGIN, window.innerHeight - 200))
    });

    const [shadow, setShadow] = useState<Character>({
        id: 'shadow',
        name: 'Shadow',
        position: getInitialPos(130),
        mood: 'idle',
        currentThought: null,
        showInteractionMenu: false,
        isDragging: false,
        isHidden: false,
    });

    const [sakura, setSakura] = useState<Character>({
        id: 'sakura',
        name: 'Sakura',
        position: getInitialPos(230),
        mood: 'idle',
        currentThought: null,
        showInteractionMenu: false,
        isDragging: false,
        isHidden: false,
    });

    const shadowRef = useRef<HTMLDivElement>(null);
    const sakuraRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [gameState, setGameState] = useState<'none' | 'hideSeek' | 'rps' | 'follow'>('none');

    const clampPosition = useCallback((x: number, y: number) => {
        const maxX = window.innerWidth - 70;
        const maxY = window.innerHeight - 100;
        return {
            x: Math.max(MARGIN / 2, Math.min(maxX, x)),
            y: Math.max(MARGIN / 2, Math.min(maxY, y))
        };
    }, []);

    useEffect(() => {
        onPositionChange?.(shadow.position, sakura.position);
    }, [shadow.position, sakura.position, onPositionChange]);

    // Complex AI Dialogues
    useEffect(() => {
        if (status === 'focusing' || shadow.isDragging || sakura.isDragging || isGenerating || gameState !== 'none') return;
        if (shadow.isHidden || sakura.isHidden) return;

        const handleTalk = async () => {
            if (shadow.currentThought || sakura.currentThought) return;
            setIsGenerating(true);

            const roll = Math.random();
            if (roll < 0.25 && relationshipLevel > 20) {
                // Love talk
                const sMsg = await generateAIDialogue('shadow', "Say something sweet to Sakura.", relationshipLevel, conversationMemory);
                if (sMsg) {
                    setShadow(prev => ({ ...prev, currentThought: sMsg, mood: 'love' }));
                    setTimeout(async () => {
                        const skMsg = await generateAIDialogue('sakura', `Shadow said: "${sMsg}". Reply lovingly.`, relationshipLevel, conversationMemory);
                        if (skMsg) setSakura(prev => ({ ...prev, currentThought: skMsg, mood: 'love' }));
                    }, 2500);
                }
            } else if (roll < 0.5) {
                // Advice / Curiosity
                const who = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const msg = await generateAIDialogue(who, "Ask user for advice or share a productivity thought.", relationshipLevel, conversationMemory);
                if (msg) (who === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: msg, mood: 'talking' }));
            } else {
                // Casual
                const msg = await generateAIDialogue('shadow', "Share a casual thought with Sakura or the user.", relationshipLevel, conversationMemory);
                if (msg) setShadow(prev => ({ ...prev, currentThought: msg, mood: 'talking' }));
            }

            setTimeout(() => {
                setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                setIsGenerating(false);
            }, 6000);
        };

        const interval = setInterval(handleTalk, IDLE_TALK_INTERVAL);
        return () => clearInterval(interval);
    }, [status, shadow.isDragging, sakura.isDragging, isGenerating, gameState, relationshipLevel, shadow.isHidden, sakura.isHidden]);

    // Games Management Logic
    useEffect(() => {
        const triggerGame = async () => {
            if (shadow.isDragging || sakura.isDragging || isGenerating || gameState !== 'none') return;

            const gameRoll = Math.random();
            if (gameRoll < 0.4) {
                // Hide & Seek
                setGameState('hideSeek');
                const hider = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const seeker = hider === 'shadow' ? 'sakura' : 'shadow';

                (hider === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, isHidden: true, mood: 'hiding' }));
                const seekMsg = await generateAIDialogue(seeker, `React to ${hider} hiding!`, relationshipLevel, conversationMemory);
                (seeker === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: seekMsg || "Where are you? 👀", mood: 'seeking' }));

                setTimeout(() => {
                    (hider === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, isHidden: false, mood: 'happy' }));
                    (seeker === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: "Found you! ✨", mood: 'happy' }));
                    increaseRelationship(1);
                    setTimeout(() => {
                        setGameState('none');
                        setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                        setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    }, 3000);
                }, 6000);

            } else if (gameRoll < 0.7) {
                // Rock Paper Scissors (Jan-ken-pon)
                setGameState('rps');
                const rpsMsg = await generateAIDialogue('shadow', "Challenge Sakura to Rock Paper Scissors!", relationshipLevel, conversationMemory);
                setShadow(prev => ({ ...prev, currentThought: rpsMsg || "Jan-ken-pon!", mood: 'talking' }));

                setTimeout(() => {
                    const choices = ['rock', 'paper', 'scissors'];
                    const sChoice = choices[Math.floor(Math.random() * 3)];
                    const skChoice = choices[Math.floor(Math.random() * 3)];

                    setShadow(prev => ({ ...prev, currentThought: `RPS: ${sChoice}!`, mood: 'playing' }));
                    setSakura(prev => ({ ...prev, currentThought: `RPS: ${skChoice}!`, mood: 'playing' }));

                    setTimeout(() => {
                        setGameState('none');
                        setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                        setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    }, 4000);
                }, 3000);

            } else {
                // Follow the leader
                setGameState('follow');
                const leader = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const follower = leader === 'shadow' ? 'sakura' : 'shadow';

                const leadMsg = await generateAIDialogue(leader, "Tell the other to follow you!", relationshipLevel, conversationMemory);
                (leader === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: leadMsg || "Follow me!", mood: 'walking' }));

                const wander = () => {
                    const nextPos = clampPosition(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
                    (leader === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, position: nextPos }));
                    setTimeout(() => {
                        (follower === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, position: { x: nextPos.x - 40, y: nextPos.y } }));
                    }, 400);
                };

                wander();
                setTimeout(wander, 2000);
                setTimeout(wander, 4000);

                setTimeout(() => {
                    setGameState('none');
                    setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                }, 7000);
            }
        };

        const interval = setInterval(triggerGame, GAME_INTERVAL);
        return () => clearInterval(interval);
    }, [shadow.isDragging, sakura.isDragging, isGenerating, gameState, relationshipLevel]);

    // Roam Anywhere Logic
    useEffect(() => {
        const roam = () => {
            if (shadow.isDragging || sakura.isDragging || status === 'focusing' || gameState !== 'none') return;
            if (shadow.currentThought || sakura.currentThought) return;

            const move = (char: 'shadow' | 'sakura') => {
                const targetX = Math.random() * window.innerWidth;
                const targetY = Math.random() * window.innerHeight;
                const pos = clampPosition(targetX, targetY);
                (char === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, mood: 'walking', position: pos }));
                setTimeout(() => (char === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, mood: 'idle' })), 1200);
            };

            if (Math.random() > 0.4) move('shadow');
            if (Math.random() > 0.4) move('sakura');
        };

        const interval = setInterval(roam, 15000);
        return () => clearInterval(interval);
    }, [shadow.isDragging, sakura.isDragging, status, gameState, clampPosition, shadow.currentThought, sakura.currentThought]);

    // Learning Logic
    useEffect(() => {
        const learn = async () => {
            if (gameState !== 'none' || shadow.currentThought || sakura.currentThought) return;
            const who = Math.random() > 0.5 ? 'shadow' : 'sakura';
            const msg = await generateAIDialogue(who, "Share a tiny new fact or study hack you 'just learned'.", relationshipLevel, conversationMemory);
            if (msg) {
                (who === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: `💡 ${msg}`, mood: 'learning' }));
                toast.info(`${who === 'shadow' ? 'Shadow' : 'Sakura'} found a tip!`);
                setTimeout(() => (who === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 6000);
            }
        };
        const interval = setInterval(learn, LEARNING_INTERVAL);
        return () => clearInterval(interval);
    }, [gameState, relationshipLevel, shadow.currentThought, sakura.currentThought]);

    // Interaction Handlers
    const handlePet = async (charId: 'shadow' | 'sakura') => {
        const response = await generateAIDialogue(charId, "User petted you. React warmly!", relationshipLevel, conversationMemory);
        (charId === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: response || "Thanks! 💕", mood: 'happy', showInteractionMenu: false }));
        increaseRelationship(3);
        setTimeout(() => (charId === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 4000);
    };

    const handleTalkAction = async (charId: 'shadow' | 'sakura') => {
        const response = await generateAIDialogue(charId, "User wants to talk to you specifically.", relationshipLevel, conversationMemory);
        (charId === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: response || "Hi there!", mood: 'talking', showInteractionMenu: false }));
        increaseRelationship(1);
        setTimeout(() => (charId === 'shadow' ? setShadow : setSakura)(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 5000);
    };

    return (
        <>
            <JapaneseCharacter
                character={shadow}
                type="shadow"
                onPet={() => handlePet('shadow')}
                onTalk={() => handleTalkAction('shadow')}
                onPositionChange={(pos) => setShadow(prev => ({ ...prev, position: pos }))}
                onDragStart={() => setShadow(prev => ({ ...prev, isDragging: true, showInteractionMenu: false }))}
                onDrag={(info) => setShadow(prev => ({ ...prev, position: clampPosition(info.point.x - 30, info.point.y - 40) }))}
                onDragEnd={() => setShadow(prev => ({ ...prev, isDragging: false, mood: 'idle' }))}
                onToggleMenu={() => setShadow(prev => ({ ...prev, showInteractionMenu: !prev.showInteractionMenu }))}
            />
            <JapaneseCharacter
                character={sakura}
                type="sakura"
                onPet={() => handlePet('sakura')}
                onTalk={() => handleTalkAction('sakura')}
                onPositionChange={(pos) => setSakura(prev => ({ ...prev, position: pos }))}
                onDragStart={() => setSakura(prev => ({ ...prev, isDragging: true, showInteractionMenu: false }))}
                onDrag={(info) => setSakura(prev => ({ ...prev, position: clampPosition(info.point.x - 30, info.point.y - 40) }))}
                onDragEnd={() => setSakura(prev => ({ ...prev, isDragging: false, mood: 'idle' }))}
                onToggleMenu={() => setSakura(prev => ({ ...prev, showInteractionMenu: !prev.showInteractionMenu }))}
            />
        </>
    );
}

function JapaneseCharacter({ character, type, onPet, onTalk, onDragStart, onDrag, onDragEnd, onToggleMenu }: any) {
    const isShadow = type === 'shadow';
    const hairColor = isShadow ? '#1a1a2e' : '#2d1b1b';
    const skinColor = '#fce4d6';
    const primary = isShadow ? '#1e293b' : '#fda4af';
    const accent = isShadow ? '#67e8f9' : '#f9a8d4';

    if (character.isHidden) {
        return (
            <div className="fixed z-[9998]" style={{ left: character.position.x, top: character.position.y }}>
                <div className="w-10 h-10 bg-slate-800/20 rounded-full animate-pulse flex items-center justify-center">
                    <Eye className="w-4 h-4 text-slate-400 opacity-40" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            drag dragMomentum={false} dragElastic={0}
            onDragStart={onDragStart}
            onDrag={(e, info) => onDrag(info)}
            onDragEnd={onDragEnd}
            className="fixed z-[9999] cursor-grab active:cursor-grabbing touch-none select-none"
            style={{ left: character.position.x, top: character.position.y, transition: character.isDragging ? 'none' : 'left 0.8s ease-out, top 0.8s ease-out' }}
        >
            <motion.div
                animate={{ y: character.mood === 'walking' ? [0, -4, 0] : [0, -2, 0], scale: character.isDragging ? 1.1 : 1 }}
                transition={{ y: { repeat: Infinity, duration: character.mood === 'walking' ? 0.25 : 2.5 } }}
                className="relative w-14 h-20 group"
                onClick={onToggleMenu}
            >
                {/* Speech Bubble (Mobile Optimized) */}
                <AnimatePresence>
                    {character.currentThought && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                                "absolute z-50 pointer-events-none w-max max-w-[150px] sm:max-w-[220px]",
                                "left-1/2 -translate-x-1/2 bottom-full mb-3"
                            )}
                        >
                            <div className={cn(
                                "px-3 py-2 rounded-2xl shadow-xl border text-[10px] sm:text-[12px] font-medium leading-tight text-center",
                                isShadow ? "bg-slate-900 border-cyan-500/30 text-cyan-50" : "bg-white border-pink-200 text-pink-900"
                            )}>
                                {character.currentThought}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Interaction Menu */}
                <AnimatePresence>
                    {character.showInteractionMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 z-[60]"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onPet(); }} className="p-2 bg-white shadow-lg rounded-full border border-pink-100"><Heart className="w-4 h-4 text-pink-500" fill="currentColor" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onTalk(); }} className="p-2 bg-white shadow-lg rounded-full border border-cyan-100"><MessageCircle className="w-4 h-4 text-cyan-500" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SVG Character */}
                <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-lg">
                    <ellipse cx="30" cy="20" rx="15" ry="13" fill={hairColor} />
                    <ellipse cx="30" cy="24" rx="12" ry="11" fill={skinColor} />
                    {isShadow ? (
                        <path d="M18 20 Q30 10 42 20 Q40 16 30 14 Q20 16 18 20" fill={hairColor} />
                    ) : (
                        <>
                            <path d="M16 22 Q30 8 44 22 Q42 14 30 12 Q18 14 16 22" fill={hairColor} />
                            <circle cx="44" cy="14" r="4" fill="#fbbf24" /><circle cx="44" cy="14" r="2" fill="#fde68a" />
                        </>
                    )}
                    <g>
                        <ellipse cx="25" cy="24" rx="2.5" ry="3.5" fill="white" />
                        <motion.ellipse cx="25" cy="24" rx="2" ry="3" fill={isShadow ? "#374151" : "#78350f"}
                            animate={{ scaleY: [1, 1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 3.5 }} />
                        <ellipse cx="35" cy="24" rx="2.5" ry="3.5" fill="white" />
                        <motion.ellipse cx="35" cy="24" rx="2" ry="3" fill={isShadow ? "#374151" : "#78350f"}
                            animate={{ scaleY: [1, 1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 3.5, delay: 0.1 }} />
                    </g>
                    {isShadow ? (
                        <path d="M20 38 L20 70 Q30 75 40 70 L40 38 Q30 42 20 38" fill={primary} />
                    ) : (
                        <>
                            <path d="M18 38 L16 72 Q30 78 44 72 L42 38 Q30 44 18 38" fill={primary} />
                            <rect x="20" y="52" width="20" height="6" fill={accent} rx="1" />
                        </>
                    )}
                </svg>

                {/* Mood Indicators */}
                <AnimatePresence>
                    {character.mood === 'love' && (
                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: -20 }} exit={{ opacity: 0 }} className="absolute -top-2 left-1/2">
                            <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-bounce" />
                        </motion.div>
                    )}
                    {character.mood === 'playing' && (
                        <motion.div initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} className="absolute -top-2 -right-2">
                            <Gamepad2 className="w-5 h-5 text-yellow-500" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={cn("absolute inset-0 -z-10 rounded-full blur-xl opacity-20 scale-150", isShadow ? "bg-cyan-500" : "bg-pink-500")} />
            </motion.div>
        </motion.div>
    );
}
