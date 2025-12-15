import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Group {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null; // Added avatar_url
    created_at: string;
    is_pinned?: boolean;
    is_archived?: boolean;
}

interface GroupWithLastMessage extends Group {
    lastMessage?: {
        content: string;
        created_at: string;
        sender_name: string;
    };
    unreadCount: number;
}

interface ChatsData {
    groups: GroupWithLastMessage[];
}

export function useChatsData() {
    return useQuery({
        queryKey: ['chats'],
        queryFn: async (): Promise<ChatsData> => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            // Load groups where user is a member
            // Try to get is_pinned and is_archived if they exist, otherwise ignore
            const { data: memberData, error: memberError } = await supabase
                .from("group_members")
                .select("group_id, is_pinned, is_archived")
                .eq("user_id", user.id);

            // If columns don't exist, fetch without them
            const memberDataFinal = memberError?.message?.includes("does not exist")
                ? (await supabase.from("group_members").select("group_id").eq("user_id", user.id)).data
                : memberData;

            if (!memberDataFinal || memberDataFinal.length === 0) {
                return { groups: [] };
            }

            const groupIds = memberDataFinal.map((m: any) => m.group_id);
            const memberMap = new Map(memberDataFinal.map((m: any) => [m.group_id, m]));

            // Load group details
            const { data: groupsData } = await supabase
                .from("groups")
                .select("*")
                .in("id", groupIds)
                .order("created_at", { ascending: false });

            if (!groupsData) {
                return { groups: [] };
            }

            // Load last message and unread count for each group
            const groupsWithMessages = await Promise.all(
                groupsData.map(async (group) => {
                    // Get last message
                    const { data: lastMsg } = await supabase
                        .from("group_messages")
                        .select("content, created_at, sender:profiles(username)")
                        .eq("group_id", group.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 results

                    // Get unread count: messages user hasn't sent and hasn't read
                    const { data: groupMsgs } = await supabase
                        .from("group_messages")
                        .select("id")
                        .eq("group_id", group.id)
                        .neq("sender_id", user.id);

                    let unreadCount = 0;
                    if (groupMsgs && groupMsgs.length > 0) {
                        const messageIds = groupMsgs.map(m => m.id);
                        const { data: readReceipts } = await (supabase as any)
                            .from("message_read_receipts")
                            .select("message_id")
                            .in("message_id", messageIds)
                            .eq("user_id", user.id);

                        const readMessageIds = new Set((readReceipts || []).map((r: any) => r.message_id));
                        unreadCount = groupMsgs.filter(m => !readMessageIds.has(m.id)).length;
                    }

                    const memberInfo = memberMap.get(group.id);

                    return {
                        ...group,
                        is_pinned: memberInfo?.is_pinned || false,
                        is_archived: memberInfo?.is_archived || false,
                        lastMessage: lastMsg ? {
                            content: lastMsg.content,
                            created_at: lastMsg.created_at,
                            sender_name: (lastMsg.sender as any)?.username || "Unknown"
                        } : undefined,
                        unreadCount: Math.min(unreadCount, 99)
                    };
                })
            );

            // Sort: Pinned first, then by date
            const sortedGroups = groupsWithMessages.sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                const dateA = new Date(a.lastMessage?.created_at || a.created_at).getTime();
                const dateB = new Date(b.lastMessage?.created_at || b.created_at).getTime();
                return dateB - dateA;
            });

            return { groups: sortedGroups };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}
