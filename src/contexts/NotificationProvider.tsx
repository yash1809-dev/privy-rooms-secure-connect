import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Types
interface NotificationData {
    id: string;
    type: 'message' | 'call';
    title: string;
    body: string;
    icon?: string;
    groupId?: string;
    callerId?: string;
    timestamp: number;
}

interface NotificationContextType {
    permission: NotificationPermission;
    isSupported: boolean;
    showPermissionDialog: boolean;
    requestPermission: () => Promise<NotificationPermission>;
    closePermissionDialog: () => void;
    showMessageNotification: (data: {
        groupId: string;
        groupName: string;
        senderName: string;
        senderAvatar?: string;
        content: string;
        isAudio?: boolean;
        isFile?: boolean;
    }) => void;
    showCallNotification: (data: {
        callerId: string;
        callerName: string;
        callerAvatar?: string;
        callId: string;
    }) => void;
    dismissNotification: (id: string) => void;
    activeNotifications: NotificationData[];
    setActiveGroupId: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [activeNotifications, setActiveNotifications] = useState<NotificationData[]>([]);

    // Refs
    const activeGroupIdRef = useRef<string | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    const ringtoneSoundRef = useRef<HTMLAudioElement | null>(null);
    const lastSoundTimeRef = useRef<number>(0);
    const permissionAskedRef = useRef(false);

    // Constants
    const SOUND_THROTTLE_MS = 1000; // Max 1 sound per second
    const NOTIFICATION_DURATION = 5000; // 5 seconds
    const PERMISSION_STORAGE_KEY = 'notification_permission_asked';

    // Initialize
    useEffect(() => {
        // Check if notifications are supported
        if ('Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }

        // Initialize sounds
        notificationSoundRef.current = new Audio('/notification.mp3');
        notificationSoundRef.current.volume = 0.5;

        ringtoneSoundRef.current = new Audio('/ringtone.mp3');
        ringtoneSoundRef.current.volume = 0.7;
        ringtoneSoundRef.current.loop = true;

        // Check if we should show permission dialog
        const hasAsked = localStorage.getItem(PERMISSION_STORAGE_KEY);
        if (!hasAsked && Notification.permission === 'default') {
            // Show dialog after a short delay
            const timer = setTimeout(() => {
                setShowPermissionDialog(true);
            }, 1500);
            return () => clearTimeout(timer);
        }

        return () => {
            notificationSoundRef.current = null;
            ringtoneSoundRef.current = null;
        };
    }, []);

    // Update active group based on current route
    useEffect(() => {
        const match = location.pathname.match(/\/chats\/([^/]+)/);
        if (match) {
            activeGroupIdRef.current = match[1];
        } else {
            activeGroupIdRef.current = null;
        }
    }, [location.pathname]);

    // Store showMessageNotification in ref for event listener
    const showMessageNotificationRef = useRef<typeof showMessageNotification | null>(null);

    // Listen for new-message events from real-time subscriptions
    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            const { groupId, senderName, senderAvatar, content, audio_url, file_url, groupName } = event.detail;

            console.log('[NotificationProvider] Received new-message event:', event.detail);

            if (showMessageNotificationRef.current) {
                showMessageNotificationRef.current({
                    groupId,
                    groupName: groupName || 'New Message',
                    senderName,
                    senderAvatar,
                    content,
                    isAudio: !!audio_url,
                    isFile: !!file_url,
                });
            }
        };

        window.addEventListener('new-message', handleNewMessage as EventListener);

        return () => {
            window.removeEventListener('new-message', handleNewMessage as EventListener);
        };
    }, []);

    // Set active group ID (for external use)
    const setActiveGroupId = useCallback((id: string | null) => {
        activeGroupIdRef.current = id;
    }, []);

    // Play notification sound with throttling
    const playNotificationSound = useCallback(() => {
        const now = Date.now();
        if (now - lastSoundTimeRef.current < SOUND_THROTTLE_MS) {
            return; // Throttled
        }

        lastSoundTimeRef.current = now;

        if (notificationSoundRef.current) {
            notificationSoundRef.current.currentTime = 0;
            notificationSoundRef.current.play().catch(e => {
                console.warn('[Notifications] Could not play sound:', e);
            });
        }
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!isSupported) {
            return 'denied';
        }

        if (permission === 'granted') {
            return 'granted';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            localStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
            setShowPermissionDialog(false);
            return result;
        } catch (error) {
            console.error('[Notifications] Error requesting permission:', error);
            return 'denied';
        }
    }, [isSupported, permission]);

    // Close permission dialog
    const closePermissionDialog = useCallback(() => {
        localStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
        setShowPermissionDialog(false);
    }, []);

    // Dismiss a notification
    const dismissNotification = useCallback((id: string) => {
        setActiveNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Show message notification
    const showMessageNotification = useCallback((data: {
        groupId: string;
        groupName: string;
        senderName: string;
        senderAvatar?: string;
        content: string;
        isAudio?: boolean;
        isFile?: boolean;
    }) => {
        // Don't show if viewing the same chat
        if (data.groupId === activeGroupIdRef.current) {
            console.log('[Notifications] Skipping - viewing same chat');
            return;
        }

        // Format message content
        let messagePreview = data.content;
        if (data.isAudio) {
            messagePreview = '🎤 Voice message';
        } else if (data.isFile) {
            messagePreview = '📎 Attachment';
        }

        const notificationId = `msg-${data.groupId}-${Date.now()}`;

        const notificationData: NotificationData = {
            id: notificationId,
            type: 'message',
            title: data.groupName,
            body: `${data.senderName}: ${messagePreview}`,
            icon: data.senderAvatar,
            groupId: data.groupId,
            timestamp: Date.now(),
        };

        // Play sound
        playNotificationSound();

        // Show in-app notification if page is visible
        if (document.visibilityState === 'visible') {
            setActiveNotifications(prev => [...prev, notificationData]);

            // Auto-dismiss after duration
            setTimeout(() => {
                dismissNotification(notificationId);
            }, NOTIFICATION_DURATION);
        }

        // Show browser notification if page is not visible OR permission granted
        if (document.visibilityState !== 'visible' && permission === 'granted') {
            try {
                const browserNotification = new Notification(notificationData.title, {
                    body: notificationData.body,
                    icon: data.senderAvatar || '/favicon.ico',
                    tag: `chat-${data.groupId}`,
                    badge: '/favicon.ico',
                    requireInteraction: false,
                });

                browserNotification.onclick = () => {
                    window.focus();
                    navigate(`/chats/${data.groupId}`);
                    browserNotification.close();
                };

                setTimeout(() => browserNotification.close(), NOTIFICATION_DURATION);
            } catch (error) {
                console.error('[Notifications] Browser notification error:', error);
            }
        }

        console.log('[Notifications] Message notification shown:', data.groupName);
    }, [permission, playNotificationSound, dismissNotification, navigate]);

    // Keep ref in sync with the callback
    useEffect(() => {
        showMessageNotificationRef.current = showMessageNotification;
    }, [showMessageNotification]);

    // Show call notification
    const showCallNotification = useCallback((data: {
        callerId: string;
        callerName: string;
        callerAvatar?: string;
        callId: string;
    }) => {
        const notificationId = `call-${data.callId}`;

        const notificationData: NotificationData = {
            id: notificationId,
            type: 'call',
            title: 'Incoming Video Call',
            body: `${data.callerName} is calling...`,
            icon: data.callerAvatar,
            callerId: data.callerId,
            timestamp: Date.now(),
        };

        // Play ringtone
        if (ringtoneSoundRef.current) {
            ringtoneSoundRef.current.currentTime = 0;
            ringtoneSoundRef.current.play().catch(console.warn);
        }

        // Add to active notifications
        setActiveNotifications(prev => [...prev, notificationData]);

        // Show browser notification if page not visible
        if (document.visibilityState !== 'visible' && permission === 'granted') {
            try {
                const browserNotification = new Notification('Incoming Video Call', {
                    body: `${data.callerName} is calling...`,
                    icon: data.callerAvatar || '/favicon.ico',
                    tag: `call-${data.callId}`,
                    requireInteraction: true,
                });

                browserNotification.onclick = () => {
                    window.focus();
                    browserNotification.close();
                };
            } catch (error) {
                console.error('[Notifications] Browser notification error:', error);
            }
        }

        console.log('[Notifications] Call notification shown:', data.callerName);
    }, [permission]);

    const value: NotificationContextType = {
        permission,
        isSupported,
        showPermissionDialog,
        requestPermission,
        closePermissionDialog,
        showMessageNotification,
        showCallNotification,
        dismissNotification,
        activeNotifications,
        setActiveGroupId,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
