import React from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationProvider';

export function NotificationPermissionDialog() {
    const { showPermissionDialog, requestPermission, closePermissionDialog, isSupported } = useNotifications();

    if (!showPermissionDialog || !isSupported) {
        return null;
    }

    const handleEnable = async () => {
        await requestPermission();
    };

    const handleLater = () => {
        closePermissionDialog();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
                    onClick={handleLater}
                >
                    <X className="h-5 w-5 text-gray-400" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bell className="h-8 w-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                    Stay Connected
                </h2>

                {/* Description */}
                <p className="text-gray-400 text-center mb-6">
                    Enable notifications to never miss a message or video call from your friends and groups.
                </p>

                {/* Features list */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-4 w-4 text-blue-400" />
                        </div>
                        <span>Get notified when you receive new messages</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-4 w-4 text-green-400" />
                        </div>
                        <span>Never miss an incoming video call</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <BellOff className="h-4 w-4 text-purple-400" />
                        </div>
                        <span>You can disable notifications anytime</span>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                    <button
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-white font-semibold transition-all shadow-lg shadow-blue-500/25"
                        onClick={handleEnable}
                    >
                        Enable Notifications
                    </button>
                    <button
                        className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 font-medium transition-colors"
                        onClick={handleLater}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
