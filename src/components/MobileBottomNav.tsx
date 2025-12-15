import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
    unreadCount?: number;
}

export function MobileBottomNav({ unreadCount = 0 }: MobileBottomNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            path: '/dashboard',
        },
        {
            icon: MessageSquare,
            label: 'Chats',
            path: '/chats',
            badge: unreadCount,
        },
        {
            icon: User,
            label: 'Profile',
            path: '/profile',
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t lg:hidden">
            <div className="flex items-center justify-around h-16 safe-area-inset-bottom">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const isChats = item.label === 'Chats';

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                'relative flex flex-col items-center justify-center flex-1 h-full transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <div className="relative">
                                <Icon className="h-6 w-6" />
                                {item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-card" />
                                )}
                            </div>
                            <span className="text-xs mt-1">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
