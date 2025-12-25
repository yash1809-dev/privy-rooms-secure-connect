import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    silent?: boolean;
}

export function useBrowserNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const activeGroupIdRef = useRef<string | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    const navigate = useNavigate();

    // Initialize notification support and permission status
    useEffect(() => {
        if ('Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }

        // Initialize notification sound
        notificationSoundRef.current = new Audio('/notification.mp3');
        notificationSoundRef.current.volume = 0.5;

        return () => {
            if (notificationSoundRef.current) {
                notificationSoundRef.current = null;
            }
        };
    }, []);

    // Request notification permission
    const requestPermission = async (): Promise<NotificationPermission> => {
        if (!isSupported) {
            console.warn('Notifications are not supported in this browser');
            return 'denied';
        }

        if (permission === 'granted') {
            return 'granted';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    };

    // Set the currently active group (to avoid notifications for current chat)
    const setActiveGroupId = (groupId: string | null) => {
        activeGroupIdRef.current = groupId;
    };

    // Play notification sound
    const playNotificationSound = () => {
        if (notificationSoundRef.current) {
            // Reset and play
            notificationSoundRef.current.currentTime = 0;
            notificationSoundRef.current.play().catch(e => {
                console.warn('Could not play notification sound:', e);
            });
        }
    };

    // Show browser notification
    const showNotification = async (options: NotificationOptions): Promise<void> => {
        // Don't show notification if we're on the active group
        if (options.data?.groupId && options.data.groupId === activeGroupIdRef.current) {
            console.log('[Notifications] Skipping notification for active chat');
            return;
        }

        // Check if permission is granted
        if (permission !== 'granted') {
            console.log('[Notifications] Permission not granted, requesting...');
            const result = await requestPermission();
            if (result !== 'granted') {
                console.log('[Notifications] Permission denied');
                return;
            }
        }

        // Don't show notification if page is visible and user is on the chat
        if (document.visibilityState === 'visible' && options.data?.groupId === activeGroupIdRef.current) {
            console.log('[Notifications] Page is visible and user is on this chat, skipping notification');
            return;
        }

        try {
            // Play sound for incoming message
            if (!options.silent) {
                playNotificationSound();
            }

            // Create browser notification
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/favicon.ico',
                tag: options.tag || 'chat-notification',
                badge: '/favicon.ico',
                requireInteraction: false,
                data: options.data,
            });

            // Handle notification click
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();

                // Navigate to the chat if groupId is provided
                if (options.data?.groupId) {
                    navigate(`/chats/${options.data.groupId}`);
                }

                notification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            console.log('[Notifications] Notification shown:', options.title);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    };

    return {
        isSupported,
        permission,
        requestPermission,
        showNotification,
        setActiveGroupId,
        playNotificationSound,
    };
}
