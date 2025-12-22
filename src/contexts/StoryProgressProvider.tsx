import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { Heart, Scroll, Gift, Lock } from 'lucide-react';

interface StoryState {
    chapter: number;
    relationshipLevel: number;
    discoveredSecrets: string[];
    completedQuests: string[];
    unlockedDialogues: string[];
    mysteryProgress: number;
    lastInteraction: number;
}

interface QuestProgress {
    water_count: number;
    conversation_count: number;
    button_count: number;
}

interface StoryContextType {
    storyState: StoryState;
    questProgress: QuestProgress;
    increaseRelationship: (amount?: number) => void;
    incrementQuestProgress: (quest: 'water' | 'conversation' | 'button') => void;
    unlockDialogue: (dialogueId: string) => void;
    discoverSecret: (secret: string) => void;
    completeQuest: (questId: string) => void;
}

const StoryProgressContext = createContext<StoryContextType | undefined>(undefined);

const INITIAL_STATE: StoryState = {
    chapter: 0,
    relationshipLevel: 0,
    discoveredSecrets: [],
    completedQuests: [],
    unlockedDialogues: [],
    mysteryProgress: 0,
    lastInteraction: Date.now(),
};

const CHAPTER_THRESHOLDS = [0, 5, 10, 15, 20];
const CHAPTER_NAMES = [
    'First Encounter',
    'Growing Bond',
    'The Hidden Past',
    "Sakura's Confession",
    'True Love',
];

export function StoryProgressProvider({ children }: { children: ReactNode }) {
    const [storyState, setStoryState] = useState<StoryState>(() => {
        const saved = localStorage.getItem('neuralCoupleStory');
        return saved ? JSON.parse(saved) : INITIAL_STATE;
    });

    const [questProgress, setQuestProgress] = useState<QuestProgress>(() => {
        const saved = localStorage.getItem('neuralCoupleQuests');
        return saved ? JSON.parse(saved) : { water_count: 0, conversation_count: 0, button_count: 0 };
    });

    useEffect(() => {
        localStorage.setItem('neuralCoupleStory', JSON.stringify(storyState));
    }, [storyState]);

    useEffect(() => {
        localStorage.setItem('neuralCoupleQuests', JSON.stringify(questProgress));
    }, [questProgress]);

    useEffect(() => {
        const currentChapter = storyState.chapter;
        const newChapter = CHAPTER_THRESHOLDS.findIndex(
            (threshold, idx) =>
                storyState.relationshipLevel >= threshold &&
                idx > currentChapter &&
                storyState.relationshipLevel < (CHAPTER_THRESHOLDS[idx + 1] ?? Infinity)
        );

        if (newChapter !== -1 && newChapter > currentChapter) {
            setStoryState(prev => ({ ...prev, chapter: newChapter }));

            toast("🎭 New Chapter Unlocked!", {
                description: `Chapter ${newChapter}: ${CHAPTER_NAMES[newChapter]}`,
                icon: <Scroll className="text-purple-500" />,
                duration: 7000,
            });
        }
    }, [storyState.relationshipLevel, storyState.chapter]);

    useEffect(() => {
        const quests = [
            { id: 'water_plant_5', check: questProgress.water_count >= 5, reward: 'Special dance animation' },
            { id: 'witness_conversation', check: questProgress.conversation_count >= 3, reward: 'Secret backstory' },
            { id: 'click_50_buttons', check: questProgress.button_count >= 50, reward: 'Couple combo attack' },
        ];

        quests.forEach(quest => {
            if (quest.check && !storyState.completedQuests.includes(quest.id)) {
                setStoryState(prev => ({
                    ...prev,
                    completedQuests: [...prev.completedQuests, quest.id],
                    relationshipLevel: prev.relationshipLevel + 5,
                }));

                toast.success("🎯 Quest Complete!", {
                    description: `${quest.reward} unlocked!`,
                    icon: <Gift className="text-yellow-500" />,
                    duration: 7000,
                });
            }
        });
    }, [questProgress, storyState.completedQuests]);

    const increaseRelationship = (amount: number = 1) => {
        setStoryState(prev => {
            const newLevel = Math.min(100, prev.relationshipLevel + amount);
            const oldLevel = prev.relationshipLevel;

            if (Math.floor(newLevel / 5) > Math.floor(oldLevel / 5)) {
                toast.success("💕 Relationship Level Up!", {
                    description: `Shadow & Sakura's bond grows stronger (Level ${newLevel})`,
                    icon: <Heart className="text-pink-500" />,
                    duration: 5000,
                });
            }

            return {
                ...prev,
                relationshipLevel: newLevel,
                lastInteraction: Date.now(),
            };
        });
    };

    const incrementQuestProgress = (quest: 'water' | 'conversation' | 'button') => {
        setQuestProgress(prev => ({
            ...prev,
            [`${quest}_count`]: prev[`${quest}_count` as keyof QuestProgress] + 1,
        }));
    };

    const unlockDialogue = (dialogueId: string) => {
        setStoryState(prev => {
            if (!prev.unlockedDialogues.includes(dialogueId)) {
                return {
                    ...prev,
                    unlockedDialogues: [...prev.unlockedDialogues, dialogueId],
                };
            }
            return prev;
        });
    };

    const discoverSecret = (secret: string) => {
        setStoryState(prev => {
            if (!prev.discoveredSecrets.includes(secret)) {
                toast.info("🔮 Mystery Deepens...", {
                    description: secret,
                    icon: <Lock className="text-purple-400" />,
                    duration: 6000,
                });

                return {
                    ...prev,
                    discoveredSecrets: [...prev.discoveredSecrets, secret],
                    mysteryProgress: prev.mysteryProgress + 1,
                };
            }
            return prev;
        });
    };

    const completeQuest = (questId: string) => {
        setStoryState(prev => ({
            ...prev,
            completedQuests: [...prev.completedQuests, questId],
        }));
    };

    return (
        <StoryProgressContext.Provider
            value={{
                storyState,
                questProgress,
                increaseRelationship,
                incrementQuestProgress,
                unlockDialogue,
                discoverSecret,
                completeQuest,
            }}
        >
            {children}
        </StoryProgressContext.Provider>
    );
}

export function useStoryProgress() {
    const context = useContext(StoryProgressContext);
    if (!context) {
        throw new Error('useStoryProgress must be used within StoryProgressProvider');
    }
    return context;
}

export { CHAPTER_NAMES };
