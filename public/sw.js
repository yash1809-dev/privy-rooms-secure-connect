// CollegeOS Service Worker for Push Notifications
// This service worker handles background push notifications on mobile

const SW_VERSION = '1.0.0';

// Cache name for offline support
const CACHE_NAME = 'collegeos-cache-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker version:', SW_VERSION);
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker');
    event.waitUntil(clients.claim());
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Received message:', event.data);

    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon, tag, data } = event.data.payload;

        // Show the notification
        self.registration.showNotification(title, {
            body: body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: tag || 'default',
            data: data,
            requireInteraction: false,
            vibrate: [200, 100, 200], // Vibration pattern for mobile
            actions: [
                { action: 'open', title: 'Open' },
                { action: 'close', title: 'Dismiss' }
            ]
        });

        console.log('[SW] Notification shown:', title);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);

    event.notification.close();

    const data = event.notification.data || {};
    let targetUrl = '/';

    // Determine where to navigate based on notification data
    if (data.groupId) {
        targetUrl = `/chats/${data.groupId}`;
    } else if (data.url) {
        targetUrl = data.url;
    }

    // Handle action buttons
    if (event.action === 'close') {
        return; // Just close the notification
    }

    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Try to focus an existing window
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        client.navigate(targetUrl);
                        return;
                    }
                }
                // No existing window, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

// Handle push events (for future web push integration)
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    let notificationData = {
        title: 'CollegeOS',
        body: 'You have a new message',
        icon: '/favicon.ico',
        tag: 'push-notification'
    };

    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = {
                title: data.title || notificationData.title,
                body: data.body || notificationData.body,
                icon: data.icon || notificationData.icon,
                tag: data.tag || notificationData.tag,
                data: data.data
            };
        } catch (e) {
            console.error('[SW] Error parsing push data:', e);
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: '/favicon.ico',
            tag: notificationData.tag,
            data: notificationData.data,
            vibrate: [200, 100, 200]
        })
    );
});

console.log('[SW] Service worker loaded');
