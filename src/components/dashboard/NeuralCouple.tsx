import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Heart, MessageCircle, Eye, Lightbulb, HelpCircle } from "lucide-react";
import { useStoryProgress } from "@/contexts/StoryProgressProvider";
import { toast } from "sonner";

interface NeuralCoupleProps {
    status?: 'idle' | 'focusing' | 'excited' | 'greeting';
    onPositionChange?: (ninja: { x: number; y: number }, kunoichi: { x: number; y: number }) => void;
}

type Mood = 'idle' | 'focusing' | 'walking' | 'love' | 'happy' | 'talking' | 'hiding' | 'seeking' | 'learning';

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
const MAX_MEMORY = 20;

// Learning facts
const LEARNING_TOPICS = [
    "The Pomodoro technique helps focus!",
    "Taking breaks improves productivity",
    "Green tea boosts concentration",
    "Music without lyrics helps studying",
    "Short walks refresh your mind",
    "Hydration is key for brain power",
    "Sleep helps memory consolidation",
];

const MARGIN = 40;
const IDLE_TALK_INTERVAL = 15000;
const HIDE_SEEK_INTERVAL = 45000;
const LEARNING_INTERVAL = 60000;

// AI Service with memory
async function generateAIDialogue(
    character: 'shadow' | 'sakura',
    context: string,
    relationshipLevel: number,
    avoidPhrases: string[]
): Promise<string | null> {
    const shadowPrompt = `You are Shadow (影/Kage), a thoughtful Japanese man deeply in love with Sakura. You're protective, romantic, and caring. You wear modern Japanese streetwear with traditional elements. Speak naturally, sometimes flirty, always supportive. NEVER use these phrases that were already said: ${avoidPhrases.slice(-10).join('; ')}. Keep response under 15 words. Relationship level: ${relationshipLevel}/100.`;

    const sakuraPrompt = `You are Sakura (桜), a warm elegant Japanese woman in a beautiful kimono. You love Shadow deeply and care about helping users succeed. You're cheerful, encouraging, and playful. NEVER use these phrases that were already said: ${avoidPhrases.slice(-10).join('; ')}. Keep response under 15 words. Relationship level: ${relationshipLevel}/100.`;

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
        x: Math.min(window.innerWidth - 100, Math.max(MARGIN, window.innerWidth - offsetX)),
        y: Math.min(window.innerHeight - 180, Math.max(MARGIN, window.innerHeight - 200))
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

    const clampPosition = useCallback((x: number, y: number) => ({
        x: Math.max(MARGIN, Math.min(window.innerWidth - 80, x)),
        y: Math.max(MARGIN, Math.min(window.innerHeight - 120, y))
    }), []);

    useEffect(() => {
        onPositionChange?.(shadow.position, sakura.position);
    }, [shadow.position, sakura.position, onPositionChange]);

    // AI-Powered Dynamic Conversations
    useEffect(() => {
        if (status === 'focusing' || shadow.isDragging || sakura.isDragging || isGenerating) return;
        if (shadow.isHidden || sakura.isHidden) return;

        const haveDynamicConversation = async () => {
            if (shadow.currentThought || sakura.currentThought) return;
            setIsGenerating(true);

            const scenarios = [
                { type: 'love', chance: relationshipLevel > 20 ? 0.3 : 0.1 },
                { type: 'advice-ask', chance: 0.15 },
                { type: 'advice-give', chance: 0.2 },
                { type: 'casual', chance: 0.35 },
            ];

            const roll = Math.random();
            let cumulative = 0;
            let scenarioType = 'casual';

            for (const s of scenarios) {
                cumulative += s.chance;
                if (roll < cumulative) {
                    scenarioType = s.type;
                    break;
                }
            }

            if (scenarioType === 'love') {
                // Romantic exchange
                const shadowMsg = await generateAIDialogue('shadow',
                    `Say something romantic or sweet to Sakura. Be genuine and loving.`,
                    relationshipLevel, conversationMemory);

                if (shadowMsg) {
                    setShadow(prev => ({ ...prev, currentThought: shadowMsg, mood: 'love' }));

                    setTimeout(async () => {
                        const sakuraMsg = await generateAIDialogue('sakura',
                            `Shadow said: "${shadowMsg}". Reply lovingly, be genuine.`,
                            relationshipLevel, conversationMemory);
                        if (sakuraMsg) {
                            setSakura(prev => ({ ...prev, currentThought: sakuraMsg, mood: 'love' }));
                        }
                    }, 2500);
                }

                setTimeout(() => {
                    setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                    setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                }, 7000);

            } else if (scenarioType === 'advice-ask') {
                // Ask user for input
                const who = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const setter = who === 'shadow' ? setShadow : setSakura;

                const question = await generateAIDialogue(who,
                    `Ask the user a friendly question about what they want to study or how their day is going.`,
                    relationshipLevel, conversationMemory);

                if (question) {
                    setter(prev => ({ ...prev, currentThought: question, mood: 'talking' }));
                    setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 6000);
                }

            } else if (scenarioType === 'advice-give') {
                // Give productivity tip
                const who = Math.random() > 0.5 ? 'shadow' : 'sakura';
                const setter = who === 'shadow' ? setShadow : setSakura;

                const tip = await generateAIDialogue(who,
                    `Share a helpful productivity or study tip with the user. Be encouraging.`,
                    relationshipLevel, conversationMemory);

                if (tip) {
                    setter(prev => ({ ...prev, currentThought: `💡 ${tip}`, mood: 'talking' }));
                    setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 6000);
                }

            } else {
                // Casual chat between them
                const shadowMsg = await generateAIDialogue('shadow',
                    `Say something casual to Sakura or the user. Be natural, friendly.`,
                    relationshipLevel, conversationMemory);

                if (shadowMsg) {
                    setShadow(prev => ({ ...prev, currentThought: shadowMsg, mood: 'talking' }));
                    setTimeout(() => setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 5000);
                }
            }

            setIsGenerating(false);
        };

        const interval = setInterval(haveDynamicConversation, IDLE_TALK_INTERVAL);
        const timeout = setTimeout(haveDynamicConversation, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [status, shadow.isDragging, sakura.isDragging, shadow.currentThought, sakura.currentThought,
        isGenerating, relationshipLevel, shadow.isHidden, sakura.isHidden]);

    // Hide and Seek Game
    useEffect(() => {
        const playHideSeek = async () => {
            if (shadow.isDragging || sakura.isDragging || isGenerating) return;
            if (shadow.currentThought || sakura.currentThought) return;

            const hider = Math.random() > 0.5 ? 'shadow' : 'sakura';
            const seeker = hider === 'shadow' ? 'sakura' : 'shadow';
            const hiderSetter = hider === 'shadow' ? setShadow : setSakura;
            const seekerSetter = seeker === 'shadow' ? setShadow : setSakura;

            // Hider disappears
            hiderSetter(prev => ({ ...prev, isHidden: true, mood: 'hiding' }));

            // Seeker looks for them
            setTimeout(async () => {
                const seekMsg = await generateAIDialogue(seeker,
                    `${hider === 'shadow' ? 'Shadow' : 'Sakura'} is hiding from you. React playfully!`,
                    relationshipLevel, conversationMemory);
                seekerSetter(prev => ({ ...prev, currentThought: seekMsg || "Where did you go? 👀", mood: 'seeking' }));
            }, 1500);

            // Hider reappears
            setTimeout(async () => {
                hiderSetter(prev => ({ ...prev, isHidden: false }));
                const foundMsg = await generateAIDialogue(hider,
                    `You were hiding and got found! React playfully.`,
                    relationshipLevel, conversationMemory);
                hiderSetter(prev => ({ ...prev, currentThought: foundMsg || "Found me! ✨", mood: 'happy' }));
                seekerSetter(prev => ({ ...prev, currentThought: null, mood: 'happy' }));

                increaseRelationship(1);
            }, 5000);

            // Reset
            setTimeout(() => {
                setShadow(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
                setSakura(prev => ({ ...prev, currentThought: null, mood: 'idle' }));
            }, 8000);
        };

        const interval = setInterval(playHideSeek, HIDE_SEEK_INTERVAL);
        return () => clearInterval(interval);
    }, [shadow.isDragging, sakura.isDragging, isGenerating, relationshipLevel,
    shadow.currentThought, sakura.currentThought]);

    // Learning Feature
    useEffect(() => {
        const learnSomething = async () => {
            if (shadow.currentThought || sakura.currentThought) return;
            if (shadow.isDragging || sakura.isDragging) return;

            const learner = Math.random() > 0.5 ? 'shadow' : 'sakura';
            const setter = learner === 'shadow' ? setShadow : setSakura;

            const discovery = await generateAIDialogue(learner,
                `You just learned something interesting about productivity or studying. Share it excitedly!`,
                relationshipLevel, conversationMemory);

            if (discovery) {
                setter(prev => ({ ...prev, currentThought: `🎓 ${discovery}`, mood: 'learning' }));
                toast.info(`${learner === 'shadow' ? 'Shadow' : 'Sakura'} learned something!`, { duration: 3000 });
                setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 7000);
            }
        };

        const interval = setInterval(learnSomething, LEARNING_INTERVAL);
        return () => clearInterval(interval);
    }, [shadow.currentThought, sakura.currentThought, shadow.isDragging, sakura.isDragging, relationshipLevel]);

    // Free Roaming
    useEffect(() => {
        const roam = () => {
            if (shadow.isDragging || sakura.isDragging || status === 'focusing') return;
            if (shadow.currentThought || sakura.currentThought) return;
            if (shadow.isHidden || sakura.isHidden) return;

            if (Math.random() > 0.5) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + MARGIN,
                    Math.random() * (window.innerHeight - 200) + MARGIN
                );
                setShadow(prev => ({ ...prev, mood: 'walking', position: newPos }));
                setTimeout(() => setShadow(prev => ({ ...prev, mood: 'idle' })), 1000);
            }

            if (Math.random() > 0.5) {
                const newPos = clampPosition(
                    Math.random() * (window.innerWidth - 150) + MARGIN,
                    Math.random() * (window.innerHeight - 200) + MARGIN
                );
                setSakura(prev => ({ ...prev, mood: 'walking', position: newPos }));
                setTimeout(() => setSakura(prev => ({ ...prev, mood: 'idle' })), 1000);
            }
        };

        const interval = setInterval(roam, 20000);
        return () => clearInterval(interval);
    }, [shadow.isDragging, sakura.isDragging, shadow.currentThought, sakura.currentThought,
        status, clampPosition, shadow.isHidden, sakura.isHidden]);

    // Handlers
    const handleCharacterClick = (charId: 'shadow' | 'sakura') => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        setter(prev => ({ ...prev, showInteractionMenu: !prev.showInteractionMenu }));
    };

    const handlePet = async (charId: 'shadow' | 'sakura') => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        const response = await generateAIDialogue(charId,
            `The user pet you affectionately. React with warmth and happiness!`,
            relationshipLevel, conversationMemory);

        setter(prev => ({ ...prev, currentThought: response || "ありがとう! 💕", mood: 'happy', showInteractionMenu: false }));
        increaseRelationship(3);
        toast.success("💕 Bond +3!", { duration: 2000 });
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 4000);
    };

    const handleTalk = async (charId: 'shadow' | 'sakura') => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        const response = await generateAIDialogue(charId,
            `The user wants to chat with you. Say something encouraging or share a thought.`,
            relationshipLevel, conversationMemory);

        setter(prev => ({ ...prev, currentThought: response || "What's on your mind?", mood: 'talking', showInteractionMenu: false }));
        increaseRelationship(1);
        incrementQuestProgress('conversation');
        setTimeout(() => setter(prev => ({ ...prev, currentThought: null, mood: 'idle' })), 5000);
    };

    const handleDragStart = (charId: 'shadow' | 'sakura') => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        setter(prev => ({ ...prev, isDragging: true, showInteractionMenu: false, currentThought: null }));
    };

    const handleDrag = (charId: 'shadow' | 'sakura', info: any) => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        const clamped = clampPosition(info.point.x - 35, info.point.y - 45);
        setter(prev => ({ ...prev, position: clamped }));
    };

    const handleDragEnd = (charId: 'shadow' | 'sakura') => {
        const setter = charId === 'shadow' ? setShadow : setSakura;
        setter(prev => ({ ...prev, isDragging: false, mood: 'idle' }));
    };

    return (
        <>
            <JapaneseCharacter
                character={shadow}
                charRef={shadowRef}
                type="shadow"
                onClick={() => handleCharacterClick('shadow')}
                onPet={() => handlePet('shadow')}
                onTalk={() => handleTalk('shadow')}
                onDragStart={() => handleDragStart('shadow')}
                onDrag={(info: any) => handleDrag('shadow', info)}
                onDragEnd={() => handleDragEnd('shadow')}
            />
            <JapaneseCharacter
                character={sakura}
                charRef={sakuraRef}
                type="sakura"
                onClick={() => handleCharacterClick('sakura')}
                onPet={() => handlePet('sakura')}
                onTalk={() => handleTalk('sakura')}
                onDragStart={() => handleDragStart('sakura')}
                onDrag={(info: any) => handleDrag('sakura', info)}
                onDragEnd={() => handleDragEnd('sakura')}
            />
        </>
    );
}

// Japanese-Styled Character Component
function JapaneseCharacter({ character, charRef, type, onClick, onPet, onTalk, onDragStart, onDrag, onDragEnd }: {
    character: Character;
    charRef: React.RefObject<HTMLDivElement>;
    type: 'shadow' | 'sakura';
    onClick: () => void;
    onPet: () => void;
    onTalk: () => void;
    onDragStart: () => void;
    onDrag: (info: any) => void;
    onDragEnd: () => void;
}) {
    const isShadow = type === 'shadow';
    const skinColor = '#fce4d6';
    const hairColor = isShadow ? '#1a1a2e' : '#2d1b1b';
    const outfitPrimary = isShadow ? '#1e293b' : '#fda4af';
    const outfitSecondary = isShadow ? '#334155' : '#fecdd3';
    const accent = isShadow ? '#67e8f9' : '#f9a8d4';

    const getBubbleStyle = (): React.CSSProperties => {
        const x = character.position.x;
        const w = window.innerWidth;
        if (x > w - 220) return { right: '100%', marginRight: '10px', top: '0' };
        if (x < 220) return { left: '100%', marginLeft: '10px', top: '0' };
        return { left: '50%', transform: 'translateX(-50%)', bottom: '100%', marginBottom: '10px' };
    };

    if (character.isHidden) {
        return (
            <motion.div
                className="fixed z-[9998]"
                style={{ left: character.position.x, top: character.position.y }}
                animate={{ scale: [1, 0.8, 1], opacity: 0.3 }}
                transition={{ repeat: Infinity, duration: 1 }}
            >
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-slate-400" />
                </div>
            </motion.div>
        );
    }

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
                    y: character.mood === 'walking' ? [0, -4, 0] : [0, -2, 0],
                    scale: character.isDragging ? 1.1 : 1,
                    rotate: character.mood === 'happy' ? [0, 3, -3, 0] : 0
                }}
                transition={{
                    y: { repeat: Infinity, duration: character.mood === 'walking' ? 0.3 : 2.5 },
                    rotate: { repeat: Infinity, duration: 0.5 }
                }}
                className="relative w-14 h-20 group"
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
                            className="absolute -top-11 left-1/2 -translate-x-1/2 flex gap-2 z-50"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onPet(); }}
                                className="p-1.5 rounded-full bg-white/90 shadow-lg hover:scale-110 transition-transform border border-pink-200">
                                <Heart className="w-3.5 h-3.5 text-pink-500" fill="currentColor" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onTalk(); }}
                                className="p-1.5 rounded-full bg-white/90 shadow-lg hover:scale-110 transition-transform border border-cyan-200">
                                <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />
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
                            className="absolute z-50 pointer-events-none max-w-[200px]"
                            style={getBubbleStyle()}
                        >
                            <div className={cn(
                                "px-3 py-2 rounded-xl shadow-lg border text-[10px] font-medium leading-snug",
                                isShadow
                                    ? "bg-slate-900/95 border-cyan-500/40 text-cyan-50"
                                    : "bg-white/95 border-pink-300 text-pink-900"
                            )}>
                                {character.currentThought}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* JAPANESE CHARACTER SVG */}
                <svg viewBox="0 0 56 80" className="w-full h-full drop-shadow-md">
                    {/* Hair Back */}
                    <ellipse cx="28" cy="18" rx="14" ry="12" fill={hairColor} />

                    {/* Face */}
                    <ellipse cx="28" cy="22" rx="11" ry="10" fill={skinColor} />

                    {/* Hair Front/Bangs */}
                    {isShadow ? (
                        <path d="M17 18 Q28 8 39 18 Q37 14 28 12 Q19 14 17 18" fill={hairColor} />
                    ) : (
                        <>
                            <path d="M15 20 Q28 5 41 20 Q39 12 28 10 Q17 12 15 20" fill={hairColor} />
                            {/* Side hair */}
                            <ellipse cx="16" cy="28" rx="2" ry="6" fill={hairColor} />
                            <ellipse cx="40" cy="28" rx="2" ry="6" fill={hairColor} />
                            {/* Flower ornament */}
                            <g transform="translate(38, 10)">
                                <circle r="4" fill="#fbbf24" />
                                <circle r="2" fill="#fde68a" />
                            </g>
                        </>
                    )}

                    {/* Eyes */}
                    <g>
                        <ellipse cx="23" cy="22" rx="2.5" ry="3" fill="white" />
                        <motion.ellipse
                            cx="23" cy="22" rx="2" ry="2.5"
                            fill={isShadow ? '#374151' : '#78350f'}
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
                        />
                        <circle cx="23.5" cy="21.5" r="0.8" fill="white" opacity="0.7" />

                        <ellipse cx="33" cy="22" rx="2.5" ry="3" fill="white" />
                        <motion.ellipse
                            cx="33" cy="22" rx="2" ry="2.5"
                            fill={isShadow ? '#374151' : '#78350f'}
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 4, repeatDelay: 2, delay: 0.1 }}
                        />
                        <circle cx="33.5" cy="21.5" r="0.8" fill="white" opacity="0.7" />
                    </g>

                    {/* Blush */}
                    <ellipse cx="19" cy="26" rx="2" ry="1" fill="#fca5a5" opacity="0.4" />
                    <ellipse cx="37" cy="26" rx="2" ry="1" fill="#fca5a5" opacity="0.4" />

                    {/* Mouth */}
                    {character.mood === 'happy' || character.mood === 'love' ? (
                        <path d="M25 28 Q28 31 31 28" stroke="#be123c" strokeWidth="1" fill="none" />
                    ) : (
                        <ellipse cx="28" cy="28" rx="1.5" ry="0.8" fill="#be123c" opacity="0.5" />
                    )}

                    {/* Body - Japanese Outfit */}
                    {isShadow ? (
                        // Shadow: Modern Japanese Streetwear (Dark Haori-style jacket)
                        <g>
                            {/* Neck */}
                            <rect x="25" y="32" width="6" height="4" fill={skinColor} />
                            {/* Jacket */}
                            <path d="M18 36 L18 65 Q28 70 38 65 L38 36 Q28 40 18 36" fill={outfitPrimary} />
                            {/* Collar/Lapel */}
                            <path d="M22 36 L28 50 L34 36" stroke={outfitSecondary} strokeWidth="2" fill="none" />
                            {/* Accent stripe */}
                            <line x1="28" y1="50" x2="28" y2="65" stroke={accent} strokeWidth="1" opacity="0.6" />
                        </g>
                    ) : (
                        // Sakura: Elegant Kimono
                        <g>
                            {/* Neck */}
                            <rect x="25" y="32" width="6" height="4" fill={skinColor} />
                            {/* Kimono body */}
                            <path d="M16 36 L14 68 Q28 75 42 68 L40 36 Q28 42 16 36" fill={outfitPrimary} />
                            {/* Collar V */}
                            <path d="M22 36 L28 48 L34 36" stroke="white" strokeWidth="2" fill="none" />
                            {/* Obi (sash) */}
                            <rect x="18" y="50" width="20" height="6" rx="1" fill={accent} />
                            {/* Obi knot */}
                            <circle cx="28" cy="53" r="2.5" fill={outfitSecondary} />
                            {/* Pattern */}
                            <circle cx="22" cy="60" r="1.5" fill="white" opacity="0.3" />
                            <circle cx="34" cy="62" r="1.5" fill="white" opacity="0.3" />
                        </g>
                    )}
                </svg>

                {/* Effects */}
                <AnimatePresence>
                    {character.mood === 'love' && (
                        <>
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 0], y: -25, scale: [0, 1, 0.5], x: (i - 1) * 12 }}
                                    transition={{ duration: 1.2, delay: i * 0.25, repeat: Infinity }}
                                    className="absolute top-0 left-1/2"
                                >
                                    <Heart className="w-2.5 h-2.5 text-pink-500 fill-pink-500" />
                                </motion.div>
                            ))}
                        </>
                    )}
                    {character.mood === 'learning' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1, rotate: [0, 10, -10, 0] }}
                            transition={{ rotate: { repeat: Infinity, duration: 0.5 } }}
                            className="absolute -top-1 -right-1"
                        >
                            <Lightbulb className="w-4 h-4 text-yellow-400 fill-yellow-200" />
                        </motion.div>
                    )}
                    {character.mood === 'seeking' && (
                        <motion.div
                            animate={{ x: [-3, 3, -3] }}
                            transition={{ repeat: Infinity, duration: 0.3 }}
                            className="absolute -top-1 -right-1"
                        >
                            <HelpCircle className="w-4 h-4 text-cyan-400" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Glow */}
                <div className={cn(
                    "absolute inset-0 -z-10 rounded-full blur-xl opacity-25 scale-150",
                    isShadow ? "bg-cyan-400" : "bg-pink-400"
                )} />
            </motion.div>
        </motion.div>
    );
}
