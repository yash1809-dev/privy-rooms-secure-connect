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
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {activeNotifications.slice(0, 3).map((notification) => (
                <div
                    key={notification.id}
                    className="pointer-events-auto bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-xl p-4 shadow-2xl animate-in slide-in-from-right-full duration-300 cursor-pointer hover:bg-slate-800/95 transition-colors"
                    onClick={() => handleClick(notification)}
                >
                    <div className="flex items-start gap-3">
                        {/* Icon/Avatar */}
                        <div className="flex-shrink-0">
                            {notification.icon ? (
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={notification.icon} alt="" />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                        {notification.title.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notification.type === 'call'
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                                    }`}>
                                    {notification.type === 'call' ? (
                                        <Phone className="h-5 w-5 text-white" />
                                    ) : (
                                        <MessageCircle className="h-5 w-5 text-white" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {notification.title}
                            </p>
                            <p className="text-sm text-gray-400 truncate">
                                {notification.body}
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                            }}
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Call actions */}
                    {notification.type === 'call' && (
                        <div className="flex gap-2 mt-3">
                            <button
                                className="flex-1 py-2 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dismissNotification(notification.id);
                                }}
                            >
                                Decline
                            </button>
                            <button
                                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-colors"
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
                <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-lg border border-white/10 rounded-xl p-3 text-center text-sm text-gray-400">
                    +{activeNotifications.length - 3} more notifications
                </div>
            )}
        </div>
    );
}
