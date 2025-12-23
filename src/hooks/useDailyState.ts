import { useDebouncedLocalStorage } from './useDebouncedLocalStorage';

/**
 * Hook for managing daily-reset state with automatic localStorage persistence
 * Clears state if date changes
 */
export function useDailyState<T>(
    key: string,
    initialValue: T,
    debounceMs: number = 500
): [T, (value: T | ((prev: T) => T)) => void] {
    const today = new Date().toDateString();

    const [state, setState] = useDebouncedLocalStorage<{ date: string; data: T }>(
        key,
        { date: today, data: initialValue },
        debounceMs
    );

    // Safety: Check if state has the expected structure before accessing properties
    const hasValidStructure = state && typeof state === 'object' && 'date' in state && 'data' in state;
    const currentData = (hasValidStructure && state.date === today) ? state.data : initialValue;

    const setData = (value: T | ((prev: T) => T)) => {
        setState((prev) => {
            // Safety: Check prev structure before accessing
            const hasValidPrev = prev && typeof prev === 'object' && 'date' in prev && 'data' in prev;
            const prevData = (hasValidPrev && prev.date === today) ? prev.data : initialValue;

            const newData = value instanceof Function ? value(prevData) : value;
            return {
                date: today,
                data: newData,
            };
        });
    };

    return [currentData, setData];
}
