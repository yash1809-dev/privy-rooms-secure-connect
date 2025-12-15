import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendMessageParams {
    groupId: string;
    content: string;
    messageType?: string;
    voiceNoteUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
}

interface OptimisticMessage {
    id: string;
    group_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    message_type: string;
    voice_note_url?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    sender: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
    isOptimistic?: boolean;
}

export function useOptimisticMessages(groupId: string) {
    const queryClient = useQueryClient();

    const sendMessage = useMutation({
        mutationFn: async (params: SendMessageParams) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await (supabase as any)
                .from("group_messages")
                .insert({
                    group_id: params.groupId,
                    sender_id: user.id,
                    content: params.content,
                    message_type: params.messageType || "text",
                    voice_note_url: params.voiceNoteUrl,
                    file_url: params.fileUrl,
                    file_name: params.fileName,
                    file_size: params.fileSize,
                })
                .select("*, sender:profiles(id, username, avatar_url)")
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async (params: SendMessageParams) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["messages", groupId] });

            // Get current user info
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", user.id)
                .single();

            // Create optimistic message
            const optimisticMessage: OptimisticMessage = {
                id: `temp-${Date.now()}`,
                group_id: params.groupId,
                sender_id: user.id,
                content: params.content,
                created_at: new Date().toISOString(),
                message_type: params.messageType || "text",
                voice_note_url: params.voiceNoteUrl,
                file_url: params.fileUrl,
                file_name: params.fileName,
                file_size: params.fileSize,
                sender: {
                    id: user.id,
                    username: profile?.username || "You",
                    avatar_url: profile?.avatar_url || null,
                },
                isOptimistic: true,
            };

            // Snapshot previous value
            const previousMessages = queryClient.getQueryData(["messages", groupId]);

            // Optimistically update the cache
            queryClient.setQueryData(["messages", groupId], (old: any) => {
                if (!old) return [optimisticMessage];
                return [...old, optimisticMessage];
            });

            // Return context with snapshot
            return { previousMessages };
        },
        onError: (err, params, context: any) => {
            // Rollback on error
            if (context?.previousMessages) {
                queryClient.setQueryData(["messages", groupId], context.previousMessages);
            }
            toast.error("Failed to send message");
        },
        onSuccess: (data) => {
            // Replace optimistic message with real one
            queryClient.setQueryData(["messages", groupId], (old: any) => {
                if (!old) return [data];

                // Remove optimistic message and add real one
                const withoutOptimistic = old.filter((msg: OptimisticMessage) => !msg.isOptimistic);
                return [...withoutOptimistic, data];
            });

            // Invalidate to ensure sync
            queryClient.invalidateQueries({ queryKey: ["messages", groupId] });
            queryClient.invalidateQueries({ queryKey: ["chats"] });
        },
    });

    return {
        sendMessage,
    };
}
