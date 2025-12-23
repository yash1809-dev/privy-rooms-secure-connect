import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for localStorage with debounced writes to prevent main thread blocking
 */
export function useDebouncedLocalStorage<T>(
    key: string,
    initialValue: T,
    debounceMs: number = 500
): [T, (value: T | ((prev: T) => T)) => void] {
    // Initialize state from localStorage synchronously
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Ref to hold the debounce timer
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced save function
    const debouncedSave = useCallback((value: T) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Error saving to localStorage key "${key}":`, error);
            }
        }, debounceMs);
    }, [key, debounceMs]);

    // Update state and trigger debounced save
    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        setStoredValue((prev) => {
            const newValue = value instanceof Function ? value(prev) : value;
            debouncedSave(newValue);
            return newValue;
        });
    }, [debouncedSave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                // Flush pending write immediately on unmount
                try {
                    localStorage.setItem(key, JSON.stringify(storedValue));
                } catch (error) {
                    console.error(`Error flushing localStorage key "${key}":`, error);
                }
            }
        };
    }, [key, storedValue]);

    return [storedValue, setValue];
}

/**
 * Simple localStorage hook without debouncing for values that change infrequently
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        setStoredValue((prev) => {
            const newValue = value instanceof Function ? value(prev) : value;
            try {
                localStorage.setItem(key, JSON.stringify(newValue));
            } catch (error) {
                console.error(`Error saving to localStorage key "${key}":`, error);
            }
            return newValue;
        });
    }, [key]);

    return [storedValue, setValue];
}
