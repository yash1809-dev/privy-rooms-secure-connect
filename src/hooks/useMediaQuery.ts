import { useState, useEffect } from 'react';

/**
 * Hook to detect if a media query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        // Set initial value
        setMatches(media.matches);

        // Create event listener
        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

        // Add listener
        media.addEventListener('change', listener);

        // Cleanup
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
    const isXl = useMediaQuery('(min-width: 1441px)');
    const isLg = useMediaQuery('(min-width: 1025px)');
    const isMd = useMediaQuery('(min-width: 769px)');
    const isSm = useMediaQuery('(min-width: 481px)');
    const isXs = useMediaQuery('(min-width: 480px)');

    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    if (isXs) return 'xs';
    return 'xs';
}

/**
 * Hook to detect if we're on mobile (< 769px)
 */
export function useMobile(): boolean {
    return !useMediaQuery('(min-width: 769px)');
}

/**
 * Hook to detect if we're on tablet (769px - 1024px)
 */
export function useTablet(): boolean {
    const isTabletOrLarger = useMediaQuery('(min-width: 769px)');
    const isDesktop = useMediaQuery('(min-width: 1025px)');
    return isTabletOrLarger && !isDesktop;
}

/**
 * Hook to detect if we're on desktop (>= 1025px)
 */
export function useDesktop(): boolean {
    return useMediaQuery('(min-width: 1025px)');
}
