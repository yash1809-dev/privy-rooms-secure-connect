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
    const [state, setState] = useDebouncedLocalStorage<{ date: string; data: T }>(
        key,
        { date: new Date().toDateString(), data: initialValue },
        debounceMs
    );

    const today = new Date().toDateString();

    // Reset if date changed
    const currentData = state.date === today ? state.data : initialValue;

    const setData = (value: T | ((prev: T) => T)) => {
        setState((prev) => {
            const newData = value instanceof Function ? value(prev.data) : value;
            return {
                date: today,
                data: newData,
            };
        });
    };

    return [currentData, setData];
}
