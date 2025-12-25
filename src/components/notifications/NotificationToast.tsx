import React from 'react';
import { X, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function NotificationToast() {
    const { activeNotifications, dismissNotification } = useNotifications();
    const navigate = useNavigate();

    if (activeNotifications.length === 0) {
        return null;
    }

    const handleClick = (notification: typeof activeNotifications[0]) => {
        if (notification.type === 'message' && notification.groupId) {
            navigate(`/chats/${notification.groupId}`);
        }
        dismissNotification(notification.id);
    };

    return (
        // Mobile: full width with smaller margins, Desktop: max-w-sm right-aligned
        <div className="fixed top-2 left-2 right-2 sm:top-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 sm:max-w-sm w-auto sm:w-full pointer-events-none">
            {activeNotifications.slice(0, 3).map((notification) => (
                <div
                    key={notification.id}
                    className="pointer-events-auto bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl animate-in slide-in-from-top-full sm:slide-in-from-right-full duration-300 cursor-pointer hover:bg-slate-800/95 transition-colors"
                    onClick={() => handleClick(notification)}
                >
                    <div className="flex items-start gap-2 sm:gap-3">
                        {/* Icon/Avatar - smaller on mobile */}
                        <div className="flex-shrink-0">
                            {notification.icon ? (
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                    <AvatarImage src={notification.icon} alt="" />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs sm:text-sm">
                                        {notification.title.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${notification.type === 'call'
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                                    }`}>
                                    {notification.type === 'call' ? (
                                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    ) : (
                                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Content - better text sizing */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate">
                                {notification.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 truncate">
                                {notification.body}
                            </p>
                        </div>

                        {/* Close button - better touch target on mobile */}
                        <button
                            className="flex-shrink-0 p-1.5 sm:p-1 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                            }}
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Call actions - better touch targets */}
                    {notification.type === 'call' && (
                        <div className="flex gap-2 mt-2 sm:mt-3">
                            <button
                                className="flex-1 py-2.5 sm:py-2 px-3 sm:px-4 bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dismissNotification(notification.id);
                                }}
                            >
                                Decline
                            </button>
                            <button
                                className="flex-1 py-2.5 sm:py-2 px-3 sm:px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-lg text-white text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Accept call logic
                                    dismissNotification(notification.id);
                                }}
                            >
                                Accept
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {/* Show count if more than 3 notifications */}
            {activeNotifications.length > 3 && (
                <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-lg border border-white/10 rounded-xl p-2 sm:p-3 text-center text-xs sm:text-sm text-gray-400">
                    +{activeNotifications.length - 3} more notifications
                </div>
            )}
        </div>
    );
}
