
import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Message {
    id: string;
    group_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    file_url?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    audio_url?: string | null;
    poll_data?: any;
    status?: 'sending' | 'sent' | 'failed';
    sender?: {
        id: string;
        username: string;
        email: string;
        avatar_url: string | null;
    };
}

export function useChatMessages(groupId: string | undefined) {
    const queryClient = useQueryClient();
    const isInitialLoadRef = useRef(true);

    // Fetch messages with enhanced caching optimized for instant updates
    const { data: messages = [], isLoading, isError } = useQuery({
        queryKey: ['messages', groupId],
        queryFn: async () => {
            if (!groupId) return [];
            console.log("Fetching messages for group:", groupId);
            const { data, error } = await supabase
                .from("group_messages")
                .select("*, sender:profiles(id,username,email,avatar_url)")
                .eq("group_id", groupId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as Message[];
        },
        enabled: !!groupId,
        staleTime: 0, // Always consider data stale for immediate refetch
        gcTime: 5 * 60 * 1000, // 5 minutes - keeps data in cache but allows instant updates
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: false, // Rely on real-time only
    });

    // Send Message Mutation with Optimistic Update
    const sendMessageMutation = useMutation({
        mutationFn: async (newMessage: Omit<Message, 'id' | 'created_at'> & { id?: string }) => {
            if (!groupId) throw new Error("No group ID");

            // If it's a file upload (has file_url or audio_url), we assume it's already uploaded
            // and we just need to insert the message record.
            // If it's text, we just insert.

            // Strip temporary properties before sending to Supabase
            const { status, sender, ...messageData } = newMessage;
            // The temp ID logic is handled by the caller or we let Supabase generate one?
            // Usually for optimistic UI we generate a temp ID.
            // But we can't send that ID to Supabase if it's a UUID and Supabase generates it.
            // Actually, we can generate a UUID on client and send it.

            // However, existing logic might rely on Supabase generation.
            // Let's assume we pass the content and other fields, and Supabase returns the real ID.

            const { data, error } = await supabase
                .from("group_messages")
                .insert(messageData)
                .select("*, sender:profiles(id,username,email,avatar_url)")
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async (newMessage) => {
            console.log("Optimistic update start:", newMessage);
            await queryClient.cancelQueries({ queryKey: ['messages', groupId] });

            const previousMessages = queryClient.getQueryData<Message[]>(['messages', groupId]);

            // Create optimistic message
            const optimisticMessage: Message = {
                ...newMessage,
                id: newMessage.id || crypto.randomUUID(), // Use provided temp ID or generate one
                created_at: new Date().toISOString(),
                status: 'sending',
                sender: newMessage.sender // Caller must provide sender info for UI
            };

            queryClient.setQueryData<Message[]>(['messages', groupId], (old = []) => {
                return [...old, optimisticMessage];
            });

            return { previousMessages, tempId: optimisticMessage.id };
        },
        onError: (err, newMessage, context) => {
            console.error("Send message error:", err);
            if (context?.previousMessages) {
                // queryClient.setQueryData(['messages', groupId], context.previousMessages);

                // Better approach: Mark as failed instead of removing
                queryClient.setQueryData<Message[]>(['messages', groupId], (old = []) => {
                    return old.map(msg =>
                        msg.id === context.tempId ? { ...msg, status: 'failed' } : msg
                    );
                });
            }
            toast.error("Failed to send message. Tap to retry.");
        },
        onSettled: (data, error, variables, context) => {
            // If successful, replace the optimistic message with the real one
            if (data && context?.tempId) {
                queryClient.setQueryData<Message[]>(['messages', groupId], (old = []) => {
                    return old.map(msg =>
                        msg.id === context.tempId ? { ...msg, ...data, status: 'sent' } : msg
                    );
                });
            }
        },
    });

    // Realtime Subscription - Enhanced for instant delivery
    useEffect(() => {
        if (!groupId) return;

        console.log("[Realtime] Setting up subscription for group:", groupId);

        const channel = supabase.channel(`group_chat_${groupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${groupId}`
                },
                async (payload: RealtimePostgresChangesPayload<Message>) => {
                    const newMessage = payload.new as Message;
                    console.log("[Realtime] INSERT received:", newMessage.id, newMessage.content?.substring(0, 20));

                    // Fetch sender details since realtime doesn't include joins
                    const { data: senderData } = await supabase
                        .from('profiles')
                        .select('id, username, email, avatar_url')
                        .eq('id', newMessage.sender_id)
                        .single();

                    const messageWithSender = {
                        ...newMessage,
                        sender: senderData,
                        status: 'sent' as const
                    };

                    // Get current user to check if this is their message
                    const { data: { user } } = await supabase.auth.getUser();
                    const isOwnMessage = user?.id === newMessage.sender_id;

                    queryClient.setQueryData<Message[]>(['messages', groupId], (current = []) => {
                        // Check if message already exists (deduplication)
                        const exists = current.some(m => m.id === newMessage.id);
                        if (exists) {
                            console.log("[Realtime] Duplicate detected, skipping:", newMessage.id);
                            return current;
                        }

                        // Also check for optimistic messages that might match
                        // (same sender, same content, within last 2 seconds, status='sending')
                        const now = new Date(newMessage.created_at).getTime();
                        const possibleDuplicate = current.find(m =>
                            m.sender_id === newMessage.sender_id &&
                            m.content === newMessage.content &&
                            m.status === 'sending' &&
                            Math.abs(new Date(m.created_at).getTime() - now) < 2000
                        );

                        if (possibleDuplicate) {
                            console.log("[Realtime] Optimistic duplicate found, replacing:", possibleDuplicate.id, "->", newMessage.id);
                            // Replace optimistic with real
                            return current.map(m => m.id === possibleDuplicate.id ? messageWithSender : m);
                        }

                        console.log("[Realtime] Adding new message:", newMessage.id);
                        return [...current, messageWithSender];
                    });

                    // Optimize: Update chat list cache directly instead of refetching
                    // This is MUCH faster than a full refetch (no database queries)
                    queryClient.setQueryData(['chats'], (oldData: any) => {
                        if (!oldData?.groups) return oldData;

                        const updatedGroups = oldData.groups.map((group: any) => {
                            if (group.id === groupId) {
                                return {
                                    ...group,
                                    lastMessage: {
                                        content: newMessage.content,
                                        created_at: newMessage.created_at,
                                        sender_name: senderData?.username || 'Unknown'
                                    },
                                    unreadCount: isOwnMessage ? group.unreadCount : (group.unreadCount || 0) + 1
                                };
                            }
                            return group;
                        });

                        // Re-sort: pinned first, then by latest message
                        const sorted = [...updatedGroups].sort((a, b) => {
                            if (a.is_pinned && !b.is_pinned) return -1;
                            if (!a.is_pinned && b.is_pinned) return 1;
                            const aTime = a.lastMessage?.created_at || a.created_at;
                            const bTime = b.lastMessage?.created_at || b.created_at;
                            return new Date(bTime).getTime() - new Date(aTime).getTime();
                        });

                        return { groups: sorted };
                    });

                    // Trigger browser notification for messages from other users
                    console.log("[Notifications] Checking if should notify:", {
                        isOwnMessage,
                        hasSenderData: !!senderData,
                        senderId: newMessage.sender_id
                    });

                    if (!isOwnMessage && senderData) {
                        console.log("[Notifications] 🔔 Dispatching notification event for:", senderData.username);

                        // Dispatch custom event with message data for notification handling
                        const event = new CustomEvent('new-message', {
                            detail: {
                                groupId,
                                messageId: newMessage.id,
                                senderId: newMessage.sender_id,
                                senderName: senderData.username,
                                senderAvatar: senderData.avatar_url,
                                content: newMessage.content,
                                audio_url: newMessage.audio_url,
                                file_url: newMessage.file_url,
                            }
                        });

                        window.dispatchEvent(event);
                        console.log("[Notifications] ✅ Event dispatched successfully");
                    } else {
                        console.log("[Notifications] ❌ Skipping notification (own message or no sender data)");
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${groupId}`
                },
                (payload) => {
                    const updatedMessage = payload.new as Message;
                    console.log("[Realtime] UPDATE received:", updatedMessage.id);
                    queryClient.setQueryData<Message[]>(['messages', groupId], (current = []) => {
                        return current.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m);
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${groupId}`
                },
                (payload) => {
                    const deletedId = payload.old.id;
                    console.log("[Realtime] DELETE received:", deletedId);
                    queryClient.setQueryData<Message[]>(['messages', groupId], (current = []) => {
                        return current.filter(m => m.id !== deletedId);
                    });
                }
            )
            .subscribe((status) => {
                console.log("[Realtime] Subscription status:", status);
                if (status === 'SUBSCRIBED') {
                    console.log("[Realtime] ✅ Successfully subscribed to group:", groupId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error("[Realtime] ❌ Channel error for group:", groupId);
                } else if (status === 'TIMED_OUT') {
                    console.error("[Realtime] ⏱️ Subscription timed out for group:", groupId);
                }
            });

        return () => {
            console.log("[Realtime] Cleaning up subscription for group:", groupId);
            supabase.removeChannel(channel);
        };
    }, [groupId, queryClient]);

    // Refetch messages when user returns to this chat (navigates back from another chat)
    useEffect(() => {
        if (!groupId) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Chat] Tab became visible, refetching messages for group:', groupId);
                queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
            }
        };

        // Refetch immediately when groupId changes (user switched chats)
        if (!isInitialLoadRef.current) {
            console.log('[Chat] Switched to group, refetching:', groupId);
            queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
        }
        isInitialLoadRef.current = false;

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [groupId, queryClient]);


    return {
        messages,
        isLoading,
        isError,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending
    };
}
