import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
    user_id: string;
    username?: string;
    is_typing: boolean;
}

export function useTypingIndicator(groupId: string) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    // Subscribe to typing status changes
    useEffect(() => {
        if (!groupId) return;

        const channel = supabase
            .channel(`typing:${groupId}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "*",
                    schema: "public",
                    table: "typing_status",
                    filter: `group_id=eq.${groupId}`,
                },
                async (payload: any) => {
                    // Refresh typing users list
                    await loadTypingUsers();
                }
            )
            .subscribe();

        loadTypingUsers();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId]);

    const loadTypingUsers = async () => {
        if (!groupId || !currentUserId) return;

        const { data } = await (supabase as any)
            .from("typing_status")
            .select("user_id, is_typing, profiles(username)")
            .eq("group_id", groupId)
            .eq("is_typing", true)
            .neq("user_id", currentUserId) // Exclude current user
            .gte("last_updated", new Date(Date.now() - 10000).toISOString()); // Only recent (last 10 seconds)

        if (data) {
            const users = data.map((t: any) => ({
                user_id: t.user_id,
                username: t.profiles?.username,
                is_typing: t.is_typing,
            }));
            setTypingUsers(users);
        } else {
            setTypingUsers([]);
        }
    };

    // Set user as typing
    const setTyping = useCallback(async () => {
        if (!groupId || !currentUserId) return;

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Upsert typing status
        await (supabase as any)
            .from("typing_status")
            .upsert(
                {
                    group_id: groupId,
                    user_id: currentUserId,
                    is_typing: true,
                    last_updated: new Date().toISOString(),
                },
                { onConflict: "group_id,user_id" }
            );

        // Auto-clear after 3 seconds of no activity
        typingTimeoutRef.current = setTimeout(() => {
            clearTyping();
        }, 3000);
    }, [groupId, currentUserId]);

    // Clear typing status
    const clearTyping = useCallback(async () => {
        if (!groupId || !currentUserId) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        await (supabase as any)
            .from("typing_status")
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", currentUserId);
    }, [groupId, currentUserId]);

    return {
        typingUsers,
        setTyping,
        clearTyping,
    };
}
