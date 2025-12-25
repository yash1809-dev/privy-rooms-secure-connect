import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for background push notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log('[Main] Service Worker registered successfully:', registration.scope);

            // Store registration globally for use by NotificationProvider
            (window as any).__swRegistration = registration;
        } catch (error) {
            console.error('[Main] Service Worker registration failed:', error);
        }
    });
}

createRoot(document.getElementById("root")!).render(<App />);
