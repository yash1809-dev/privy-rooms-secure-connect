
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

    // Fetch messages with enhanced caching
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
        staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on mount if data is fresh
        gcTime: 15 * 60 * 1000, // 15 minutes (React Query v5) - keeps inactive chat data in cache
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

        const channel = supabase.channel(`group_chat_${groupId}`, {
            config: {
                broadcast: { self: false }, // Don't broadcast to sender
                presence: { key: groupId }
            }
        })
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

    return {
        messages,
        isLoading,
        isError,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending
    };
}
