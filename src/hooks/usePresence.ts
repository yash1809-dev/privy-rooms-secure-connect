
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface PresenceState {
    onlineUsers: Set<string>;
}

export function usePresence(channelId: string, userId?: string) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!channelId || !userId) return;

        const channel = supabase.channel(channelId)
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const onlineIds = new Set<string>();

                for (const key in newState) {
                    newState[key].forEach((presence: any) => {
                        if (presence.user_id) onlineIds.add(presence.user_id);
                    });
                }
                setOnlineUsers(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: userId, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId, userId]);

    return { onlineUsers };
}
