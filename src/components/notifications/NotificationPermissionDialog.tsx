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
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Mobile: slides up from bottom, Desktop: centered modal */}
            <div className="relative bg-slate-900 border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-1 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                    onClick={handleLater}
                >
                    <X className="h-5 w-5 text-gray-400" />
                </button>

                {/* Icon - smaller on mobile */}
                <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-1.5 sm:mb-2">
                    Stay Connected
                </h2>

                {/* Description - shorter on mobile */}
                <p className="text-sm sm:text-base text-gray-400 text-center mb-4 sm:mb-6 px-2 sm:px-0">
                    Enable notifications to never miss a message or call.
                </p>

                {/* Features list - more compact on mobile */}
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                        </div>
                        <span>Get notified for new messages</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                        </div>
                        <span>Never miss a video call</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <BellOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                        </div>
                        <span>Disable anytime in settings</span>
                    </div>
                </div>

                {/* Buttons - better touch targets for mobile */}
                <div className="flex flex-col gap-2 sm:gap-3">
                    <button
                        className="w-full py-3.5 sm:py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:from-blue-700 active:to-purple-800 rounded-xl text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-blue-500/25 touch-manipulation"
                        onClick={handleEnable}
                    >
                        Enable Notifications
                    </button>
                    <button
                        className="w-full py-3.5 sm:py-3 px-4 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-gray-400 font-medium text-sm sm:text-base transition-colors touch-manipulation"
                        onClick={handleLater}
                    >
                        Maybe Later
                    </button>
                </div>

                {/* Safe area padding for mobile devices with notch/home indicator */}
                <div className="h-2 sm:h-0" />
            </div>
        </div>
    );
}
