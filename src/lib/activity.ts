
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

export const getProgression = (xp: number) => {
    const level = Math.floor(xp / 1000) + 1;
    const xpInLevel = xp % 1000;
    const progressToNextLevel = (xpInLevel / 1000) * 100;
    return { level, xpInLevel, progressToNextLevel };
};
