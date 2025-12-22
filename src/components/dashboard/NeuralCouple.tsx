import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Heart, MessageCircle, Star } from "lucide-react";
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
    showInteractionMenu: boolean;
    isDragging: boolean;
}

// AI Personality Prompts
const SHADOW_PERSONALITY = `You are Shadow, a cool but caring AI companion in CollegeOS. You're protective of users and deeply love Sakura. Keep responses under 12 words. Be supportive about productivity. Sometimes be flirty with Sakura.`;
const SAKURA_PERSONALITY = `You are Sakura, a warm cheerful AI companion in CollegeOS. You love Shadow and care about users. Keep responses under 12 words. Be encouraging about tasks. Sometimes be playful with Shadow.`;

// Fallback dialogues when API fails
const FALLBACK_DIALOGUES = {
    shadow: [
        "Stay focused, you've got this.",
        "I'm here for you.",
        "Nice progress today!",
        "Keep pushing forward.",
        "Sakura and I believe in you.",
        "Systems are looking good.",
    ],
    sakura: [
        "You're doing amazing!",
        "I'm proud of you! ✨",
        "Shadow agrees you're the best!",
        "Keep up the great work!",
        "We're cheering for you!",
        "Almost there, don't give up!",
    ],
    love: [
        { shadow: "You look beautiful today.", sakura: "Shadow... *blushes*" },
        { shadow: "I'll always protect you.", sakura: "My hero! 💕" },
        { shadow: "Stay close to me.", sakura: "Always! ❤️" },
        { shadow: "You're my favorite.", sakura: "And you're mine!" },
    ],
};

const MARGIN = 40;
const ROAM_INTERVAL = 20000;
const IDLE_TALK_INTERVAL = 18000;

// AI Service - Uses LLM7.io (free, no API key)
async function generateAIResponse(character: 'shadow' | 'sakura', context: string): Promise<string | null> {
    try {
        const response = await fetch("https://api.llm7.io/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: character === 'shadow' ? SHADOW_PERSONALITY : SAKURA_PERSONALITY
                    },
                    { role: "user", content: context }
                ],
                max_tokens: 30,
                temperature: 0.9
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch {
        return null;
    }
}

export function NeuralCouple({ status = 'idle', onPositionChange }: NeuralCoupleProps) {
    const { increaseRelationship, incrementQuestProgress, relationshipLevel } = useStoryProgress();

    const getInitialPos = (offsetX: number) => ({
        x: Math.min(window.innerWidth - 100, Math.max(MARGIN, window.innerWidth - offsetX)),
        y: Math.min(window.innerHeight - 180, Math.max(MARGIN, window.innerHeight - 200))
    });

    const [ninja, setNinja] = useState<Character>({
        id: 'ninja',
        name: 'Shadow',
        position: getInitialPos(130),
        mood: 'idle',
        currentThought: null,
        showInteractionMenu: false,
        isDragging: false,
    });

    const [kunoichi, setKunoichi] = useState<Character>({
        id: 'kunoichi',
        name: 'Sakura',
        position: getInitialPos(230),
        mood: 'idle',
        currentThought: null,
        showInteractionMenu: false,
        isDragging: false,
    });

    const ninjaRef = useRef<HTMLDivElement>(null);
    const kunoichiRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Clamp position to viewport - FIXED for all edges
    const clampPosition = useCallback((x: number, y: number) => {
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 120;
        return {
            x: Math.max(MARGIN, Math.min(maxX, x)),
            y: Math.max(MARGIN, Math.min(maxY, y))
        };
    }, []);

    // Notify parent of position changes
    useEffect(() => {
        onPositionChange?.(ninja.position, kunoichi.position);
    }, [ninja.position, kunoichi.position, onPositionChange]);

    // AI-Powered Idle Dialogue System
    useEffect(() => {
        if (status === 'focusing' || ninja.isDragging || kunoichi.isDragging || isGenerating) return;

        const showIdleDialogue = async () => {
            if (ninja.currentThought || kunoichi.currentThought) return;
            setIsGenerating(true);

            // Decide interaction type
            const isLoveInteraction = Math.random() > 0.6 && relationshipLevel > 10;

            if (isLoveInteraction) {
                // Love dialogue between characters
                const loveDialogue = FALLBACK_DIALOGUES.love[Math.floor(Math.random() * FALLBACK_DIALOGUES.love.length)];

                // Try AI generation first
                const shadowAI = await generateAIResponse('shadow', 'Say something romantic to Sakura');
                const shadow = shadowAI || loveDialogue.shadow;

                setNinja(prev => ({ ...prev, currentThought: shadow, mood: 'love' }));

                setTimeout(async () => {
                    const sakuraAI = await generateAIResponse('sakura', `Shadow said: "${shadow}". Reply lovingly.`);
                    const sakura = sakuraAI || loveDialogue.sakura;
                    setKunoichi(prev => ({ ...prev, currentThought: sakura, mood: 'love' }));
                }, 2000);

                setTimeout(() => {
                    setNinja(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setKunoichi(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                }, 6000);
            } else {
                // Individual dialogue
                const who = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const setter = who === 'shadow' ? setNinja : setKunoichi;

                const aiResponse = await generateAIResponse(who, 'Give a short motivational message about studying or productivity');
                const fallback = FALLBACK_DIALOGUES[who][Math.floor(Math.random() * FALLBACK_DIALOGUES[who].length)];

                setter(prev => ({ ...prev, currentThought: aiResponse || fallback, mood: 'talking' }));
                setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 5000);
            }

            setIsGenerating(false);
        };

        const interval = setInterval(showIdleDialogue, IDLE_TALK_INTERVAL);
        // Initial dialogue after 3 seconds
        const timeout = setTimeout(showIdleDialogue, 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [status, ninja.isDragging, kunoichi.isDragging, ninja.currentThought, kunoichi.currentThought, isGenerating, relationshipLevel]);

    // Free Roaming
    useEffect(() => {
        const roam = () => {
            if (ninja.isDragging || kunoichi.isDragging || status === 'focusing') return;
            if (ninja.currentThought || kunoichi.currentThought) return;

            const shouldNinjaRoam = Math.random() > 0.6;
            const shouldSakuraRoam = Math.random() > 0.6;

            if (shouldNinjaRoam) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + MARGIN,
                    Math.random() * (window.innerHeight - 200) + MARGIN
                );
                setNinja(prev => ({ ...prev, mood: 'walking', position: newPos }));
                setTimeout(() => setNinja(prev => ({ ...prev, mood: 'idle' })), 1000);
            }

            if (shouldSakuraRoam) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + MARGIN,
                    Math.random() * (window.innerHeight - 200) + MARGIN
                );
                setKunoichi(prev => ({ ...prev, mood: 'walking', position: newPos }));
                setTimeout(() => setKunoichi(prev => ({ ...prev, mood: 'idle' })), 1000);
            }
        };

        const interval = setInterval(roam, ROAM_INTERVAL);
        return () => clearInterval(interval);
    }, [ninja.isDragging, kunoichi.isDragging, ninja.currentThought, kunoichi.currentThought, status, clampPosition]);

    // Handlers
    const handleCharacterClick = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, showInteractionMenu: !prev.showInteractionMenu }));
    };

    const handlePet = async (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const aiResponse = await generateAIResponse(charId === 'ninja' ? 'shadow' : 'sakura', 'User pet you affectionately. React sweetly.');
        const fallback = charId === 'ninja' ? "Thanks... *happy*" : "Yay! Love you! 💕";

        setter(prev => ({ ...prev, currentThought: aiResponse || fallback, mood: 'happy', showInteractionMenu: false }));
        increaseRelationship(2);
        toast.success("💕 Bond +2!", { duration: 2000 });
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 3000);
    };

    const handleTalk = async (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const aiResponse = await generateAIResponse(charId === 'ninja' ? 'shadow' : 'sakura', 'User wants to talk. Say something encouraging.');
        const fallback = charId === 'ninja' ? "Ready to help." : "What's up? 😊";

        setter(prev => ({ ...prev, currentThought: aiResponse || fallback, mood: 'talking', showInteractionMenu: false }));
        increaseRelationship(1);
        incrementQuestProgress('conversation');
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 3000);
    };

    const handleDragStart = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, isDragging: true, showInteractionMenu: false, currentThought: null }));
    };

    const handleDrag = (charId: 'ninja' | 'kunoichi', info: any) => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        const clamped = clampPosition(info.point.x - 40, info.point.y - 50);
        setter(prev => ({ ...prev, position: clamped }));
    };

    const handleDragEnd = (charId: 'ninja' | 'kunoichi') => {
        const setter = charId === 'ninja' ? setNinja : setKunoichi;
        setter(prev => ({ ...prev, isDragging: false, mood: 'idle' }));
    };

    return (
        <>
            <CuteCharacter
                character={ninja}
                charRef={ninjaRef}
                theme="cyan"
                onClick={() => handleCharacterClick('ninja')}
                onPet={() => handlePet('ninja')}
                onTalk={() => handleTalk('ninja')}
                onDragStart={() => handleDragStart('ninja')}
                onDrag={(info: any) => handleDrag('ninja', info)}
                onDragEnd={() => handleDragEnd('ninja')}
            />
            <CuteCharacter
                character={kunoichi}
                charRef={kunoichiRef}
                theme="pink"
                onClick={() => handleCharacterClick('kunoichi')}
                onPet={() => handlePet('kunoichi')}
                onTalk={() => handleTalk('kunoichi')}
                onDragStart={() => handleDragStart('kunoichi')}
                onDrag={(info: any) => handleDrag('kunoichi', info)}
                onDragEnd={() => handleDragEnd('kunoichi')}
            />
        </>
    );
}

// Cute Anime-Style Character Component
function CuteCharacter({ character, charRef, theme, onClick, onPet, onTalk, onDragStart, onDrag, onDragEnd }: {
    character: Character;
    charRef: React.RefObject<HTMLDivElement>;
    theme: 'cyan' | 'pink';
    onClick: () => void;
    onPet: () => void;
    onTalk: () => void;
    onDragStart: () => void;
    onDrag: (info: any) => void;
    onDragEnd: () => void;
}) {
    const isShadow = theme === 'cyan';
    const primaryColor = isShadow ? 'cyan' : 'pink';
    const eyeColor = isShadow ? '#67e8f9' : '#f9a8d4';
    const hairColor = isShadow ? '#1e293b' : '#fda4af';
    const skinColor = '#fde7d9';

    const getBubbleStyle = (): React.CSSProperties => {
        const x = character.position.x;
        const w = window.innerWidth;
        if (x > w - 200) return { right: '100%', marginRight: '8px', top: '10px' };
        if (x < 200) return { left: '100%', marginLeft: '8px', top: '10px' };
        return { left: '50%', transform: 'translateX(-50%)', bottom: '100%', marginBottom: '8px' };
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={onDragStart}
            onDrag={(e, info) => onDrag(info)}
            onDragEnd={onDragEnd}
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
                    y: character.mood === 'walking' ? [0, -3, 0] : [0, -2, 0],
                    scale: character.isDragging ? 1.1 : 1,
                }}
                transition={{ y: { repeat: Infinity, duration: character.mood === 'walking' ? 0.3 : 2 } }}
                className="relative w-16 h-20 group"
                onClick={onClick}
                whileHover={{ scale: 1.08 }}
            >
                {/* Interaction Menu */}
                <AnimatePresence>
                    {character.showInteractionMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 z-50"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onPet(); }}
                                className={cn("p-2 rounded-full shadow-lg transition-transform hover:scale-110",
                                    isShadow ? "bg-cyan-500/20 border border-cyan-400" : "bg-pink-500/20 border border-pink-400")}>
                                <Heart className={cn("w-4 h-4", isShadow ? "text-cyan-400" : "text-pink-400")} fill="currentColor" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onTalk(); }}
                                className={cn("p-2 rounded-full shadow-lg transition-transform hover:scale-110",
                                    isShadow ? "bg-cyan-500/20 border border-cyan-400" : "bg-pink-500/20 border border-pink-400")}>
                                <MessageCircle className={cn("w-4 h-4", isShadow ? "text-cyan-400" : "text-pink-400")} />
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
                            className="absolute z-50 pointer-events-none max-w-[180px]"
                            style={getBubbleStyle()}
                        >
                            <div className={cn(
                                "px-3 py-2 rounded-2xl shadow-xl border text-[11px] font-medium leading-tight",
                                isShadow ? "bg-slate-900/95 border-cyan-400/50 text-cyan-50" : "bg-white/95 border-pink-300 text-pink-900"
                            )}>
                                {character.currentThought}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CUTE CHARACTER SVG */}
                <svg viewBox="0 0 64 80" className="w-full h-full drop-shadow-lg">
                    {/* Hair Back */}
                    <ellipse cx="32" cy="22" rx="18" ry="16" fill={hairColor} />

                    {/* Face */}
                    <ellipse cx="32" cy="28" rx="14" ry="13" fill={skinColor} />

                    {/* Hair Front */}
                    {isShadow ? (
                        <>
                            <path d="M18 22 Q32 8 46 22 Q44 16 32 14 Q20 16 18 22" fill={hairColor} />
                            <path d="M20 20 L24 26 L22 20" fill={hairColor} />
                            <path d="M44 20 L40 26 L42 20" fill={hairColor} />
                        </>
                    ) : (
                        <>
                            <path d="M16 24 Q32 6 48 24 Q46 14 32 12 Q18 14 16 24" fill={hairColor} />
                            <ellipse cx="22" cy="18" rx="3" ry="4" fill={hairColor} />
                            <ellipse cx="42" cy="18" rx="3" ry="4" fill={hairColor} />
                            {/* Flower accessory */}
                            <circle cx="46" cy="16" r="4" fill="#fbbf24" />
                            <circle cx="46" cy="16" r="2" fill="#fcd34d" />
                        </>
                    )}

                    {/* Eyes */}
                    <g>
                        {/* Left Eye */}
                        <ellipse cx="26" cy="28" rx="4" ry="4.5" fill="white" />
                        <motion.ellipse
                            cx="26" cy="28" rx="3" ry="3.5"
                            fill={eyeColor}
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
                        />
                        <circle cx="27" cy="27" r="1.5" fill="white" opacity="0.8" />
                        <circle cx="26" cy="29" r="2" fill="#1a1a2e" />

                        {/* Right Eye */}
                        <ellipse cx="38" cy="28" rx="4" ry="4.5" fill="white" />
                        <motion.ellipse
                            cx="38" cy="28" rx="3" ry="3.5"
                            fill={eyeColor}
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 4, repeatDelay: 2, delay: 0.1 }}
                        />
                        <circle cx="39" cy="27" r="1.5" fill="white" opacity="0.8" />
                        <circle cx="38" cy="29" r="2" fill="#1a1a2e" />
                    </g>

                    {/* Blush */}
                    <ellipse cx="21" cy="32" rx="3" ry="1.5" fill="#fca5a5" opacity="0.5" />
                    <ellipse cx="43" cy="32" rx="3" ry="1.5" fill="#fca5a5" opacity="0.5" />

                    {/* Mouth */}
                    {character.mood === 'happy' || character.mood === 'love' ? (
                        <path d="M28 35 Q32 39 36 35" stroke="#e11d48" strokeWidth="1.5" fill="none" />
                    ) : (
                        <ellipse cx="32" cy="35" rx="2" ry="1" fill="#e11d48" opacity="0.6" />
                    )}

                    {/* Body */}
                    <path
                        d={isShadow
                            ? "M22 40 Q22 42 20 50 L20 70 Q32 75 44 70 L44 50 Q42 42 42 40 Q32 44 22 40"
                            : "M20 40 Q18 45 18 55 L18 70 Q32 78 46 70 L46 55 Q46 45 44 40 Q32 46 20 40"
                        }
                        fill={isShadow ? '#1e293b' : '#fda4af'}
                    />

                    {/* Outfit details */}
                    {isShadow ? (
                        <path d="M28 45 L32 55 L36 45" stroke="#67e8f9" strokeWidth="1" fill="none" opacity="0.6" />
                    ) : (
                        <>
                            <path d="M26 50 Q32 52 38 50" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
                            <circle cx="32" cy="48" r="2" fill="white" opacity="0.3" />
                        </>
                    )}
                </svg>

                {/* Love particles for love mood */}
                <AnimatePresence>
                    {character.mood === 'love' && (
                        <>
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 0], y: -30, scale: [0, 1, 0.5], x: (i - 1) * 15 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                                    className="absolute top-0 left-1/2"
                                >
                                    <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                                </motion.div>
                            ))}
                        </>
                    )}
                </AnimatePresence>

                {/* Sparkle effect on happy */}
                <AnimatePresence>
                    {character.mood === 'happy' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute -top-2 -right-2"
                        >
                            <Sparkles className={cn("w-5 h-5", isShadow ? "text-cyan-400" : "text-yellow-400")} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ambient glow */}
                <div className={cn(
                    "absolute inset-0 -z-10 rounded-full blur-xl opacity-30 scale-150",
                    isShadow ? "bg-cyan-400" : "bg-pink-400"
                )} />
            </motion.div>
        </motion.div>
    );
}
