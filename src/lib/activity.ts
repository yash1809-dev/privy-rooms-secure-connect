
export const getActivityDays = (): string[] => {
    const saved = localStorage.getItem("activityHistory");
    return saved ? JSON.parse(saved) : [];
};

export const markTodayAsActive = () => {
    const today = new Date().toDateString();
    const activityDays = getActivityDays();
    if (!activityDays.includes(today)) {
        activityDays.push(today);
        localStorage.setItem("activityHistory", JSON.stringify(activityDays));
        return true;
    }
    return false;
};

export const calculateStreak = (): number => {
    const days = getActivityDays().sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    if (days.length === 0) return 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if active today or yesterday
    if (days[0] !== today && days[0] !== yesterday) return 0;

    let streak = 0;
    // Start checking from the most recent active day
    const checkDate = new Date(days[0]);

    for (let i = 0; i < days.length; i++) {
        const expectedDate = new Date(checkDate.getTime() - i * 86400000).toDateString();
        if (days[i] === expectedDate) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

export const getXP = (): number => {
    const saved = localStorage.getItem("userXP");
    return saved ? parseInt(saved) : 0;
};

export const addXP = (amount: number): number => {
    const currentXP = getXP();
    const newXP = currentXP + amount;
    localStorage.setItem("userXP", newXP.toString());
    return newXP;
};

// Progressive XP system - each level requires more XP than the previous
// Level 1->2: 1000 XP, Level 2->3: 1100 XP, Level 3->4: 1200 XP, etc.
export const getXPForLevel = (level: number): number => {
    // XP needed to level up FROM this level TO the next level
    return 1000 + (level - 1) * 100;
};

export const getCumulativeXPForLevel = (level: number): number => {
    // Total XP needed to REACH this level (starting from level 1 at 0 XP)
    // Using arithmetic series formula: (n-1) * [900 + 50n]
    if (level <= 1) return 0;
    const n = level;
    return (n - 1) * (900 + 50 * n);
};

export const getProgression = (xp: number) => {
    const MAX_LEVEL = 100;

    // Find current level using binary search for efficiency
    let level = 1;
    for (let testLevel = 1; testLevel <= MAX_LEVEL; testLevel++) {
        const xpNeeded = getCumulativeXPForLevel(testLevel + 1);
        if (xp >= xpNeeded) {
            level = testLevel + 1;
        } else {
            break;
        }
    }

    // Cap at max level
    if (level > MAX_LEVEL) level = MAX_LEVEL;

    // XP at the start of current level
    const xpAtLevelStart = getCumulativeXPForLevel(level);

    // XP within current level
    const xpInLevel = xp - xpAtLevelStart;

    // XP needed for next level
    const xpNeededForNextLevel = level >= MAX_LEVEL ? 0 : getXPForLevel(level);

    // Progress percentage
    const progressToNextLevel = level >= MAX_LEVEL ? 100 : Math.min(100, (xpInLevel / xpNeededForNextLevel) * 100);

    return {
        level,
        xpInLevel,
        xpNeededForNextLevel,
        progressToNextLevel
    };
};
