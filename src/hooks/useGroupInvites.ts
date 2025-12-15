import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupInvite {
    id: string;
    group_id: string;
    inviter_id: string;
    invitee_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    inviter?: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
    group?: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

export function useGroupInvites() {
    const queryClient = useQueryClient();

    // Fetch all invites (sent and received)
    const { data: invites = [], isLoading } = useQuery({
        queryKey: ['group-invites'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await (supabase as any)
                .from('group_invites')
                .select(`
          *,
          inviter:profiles!group_invites_inviter_id_fkey(id, username, avatar_url),
          group:groups(id, name, avatar_url)
        `)
                .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as GroupInvite[];
        },
        staleTime: 30 * 1000,
    });

    // Send group invite
    const sendInvite = useMutation({
        mutationFn: async ({ groupId, inviteeId }: { groupId: string; inviteeId: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await (supabase as any)
                .from('group_invites')
                .insert({ group_id: groupId, inviter_id: user.id, invitee_id: inviteeId })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-invites'] });
            toast.success("Group invite sent!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send invite");
        },
    });

    // Accept group invite
    const acceptInvite = useMutation({
        mutationFn: async (inviteId: string) => {
            const { error } = await (supabase as any)
                .from('group_invites')
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', inviteId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-invites'] });
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            toast.success("Group invite accepted!");
        },
        onError: () => {
            toast.error("Failed to accept invite");
        },
    });

    // Decline group invite
    const declineInvite = useMutation({
        mutationFn: async (inviteId: string) => {
            const { error } = await (supabase as any)
                .from('group_invites')
                .update({ status: 'declined', updated_at: new Date().toISOString() })
                .eq('id', inviteId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-invites'] });
            toast.success("Invite declined");
        },
        onError: () => {
            toast.error("Failed to decline invite");
        },
    });

    // Cancel sent invite
    const cancelInvite = useMutation({
        mutationFn: async (inviteId: string) => {
            const { error } = await (supabase as any)
                .from('group_invites')
                .delete()
                .eq('id', inviteId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-invites'] });
            toast.success("Invite cancelled");
        },
        onError: () => {
            toast.error("Failed to cancel invite");
        },
    });

    return {
        invites,
        isLoading,
        sendInvite,
        acceptInvite,
        declineInvite,
        cancelInvite,
    };
}
