import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * Container with responsive padding
 */
export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
    return (
        <div className={cn('px-4 sm:px-6 md:px-8 lg:px-12', className)}>
            {children}
        </div>
    );
}
