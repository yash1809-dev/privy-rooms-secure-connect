import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real-time Test Component
 * 
 * Add this to any page to test if Supabase Realtime is working.
 * 
 * Usage:
 * import { RealtimeTest } from '@/components/RealtimeTest';
 * <RealtimeTest />
 */
export function RealtimeTest() {
    const [status, setStatus] = useState<string>('Initializing...');
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        console.log('🧪 [Realtime Test] Starting...');
        setStatus('Connecting to Supabase Realtime...');

        // Subscribe to all message changes
        const channel = supabase
            .channel('realtime_test_channel')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'group_messages',
                },
                (payload) => {
                    console.log('🧪 [Realtime Test] Received event:', payload);
                    setMessages((prev) => [...prev, payload]);
                    setStatus(`✅ Real-time WORKING! Received ${payload.eventType} event`);
                }
            )
            .subscribe((status) => {
                console.log('🧪 [Realtime Test] Subscription status:', status);

                if (status === 'SUBSCRIBED') {
                    setStatus('✅ SUBSCRIBED - Real-time is enabled and working!');
                    setIsConnected(true);
                } else if (status === 'CHANNEL_ERROR') {
                    setStatus('❌ ERROR - Real-time is NOT enabled in Supabase Dashboard');
                    setIsConnected(false);
                } else if (status === 'TIMED_OUT') {
                    setStatus('⏱️ TIMEOUT - Connection timed out. Check network.');
                    setIsConnected(false);
                } else if (status === 'CLOSED') {
                    setStatus('🔌 CLOSED - Connection closed');
                    setIsConnected(false);
                } else {
                    setStatus(`📡 ${status}`);
                }
            });

        return () => {
            console.log('🧪 [Realtime Test] Cleaning up...');
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-md z-50 border border-white/20">
            <h3 className="font-bold text-lg mb-2">🧪 Realtime Test</h3>

            <div className="mb-3">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-sm">{status}</span>
            </div>

            <div className="text-xs">
                <p className="mb-2 text-gray-400">Send a message in any chat to test.</p>

                {messages.length > 0 && (
                    <div className="bg-white/10 p-2 rounded max-h-32 overflow-y-auto">
                        <p className="font-bold mb-1">Events received ({messages.length}):</p>
                        {messages.slice(-3).map((msg, i) => (
                            <div key={i} className="text-xs mb-1 border-b border-white/20 pb-1">
                                <span className="text-green-400">{msg.eventType}</span> - {new Date().toLocaleTimeString()}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-3 text-xs text-gray-400">
                Check browser console for detailed logs.
            </div>
        </div>
    );
}
