import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FriendRequest {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'denied';
    created_at: string;
    sender?: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
    receiver?: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
}

export function useFriendRequests() {
    const queryClient = useQueryClient();

    // Fetch all requests (sent and received)
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['friend-requests'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('friend_requests' as any)
                .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!friend_requests_receiver_id_fkey(id, username, avatar_url)
        `)
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as FriendRequest[];
        },
        staleTime: 30 * 1000, // 30 seconds
    });

    // Send friend request
    const sendRequest = useMutation({
        mutationFn: async (receiverId: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from('friend_requests' as any)
                .insert({ sender_id: user.id, receiver_id: receiverId })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
            toast.success("Friend request sent!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send request");
        },
    });

    // Accept friend request
    const acceptRequest = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase
                .from('friend_requests' as any)
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.success("Friend request accepted!");
        },
        onError: () => {
            toast.error("Failed to accept request");
        },
    });

    // Deny friend request
    const denyRequest = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase
                .from('friend_requests' as any)
                .update({ status: 'denied', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
            toast.success("Request denied");
        },
        onError: () => {
            toast.error("Failed to deny request");
        },
    });

    // Cancel sent request
    const cancelRequest = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase
                .from('friend_requests' as any)
                .delete()
                .eq('id', requestId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
            toast.success("Request cancelled");
        },
        onError: () => {
            toast.error("Failed to cancel request");
        },
    });

    // Get connection status with a user
    const getConnectionStatus = (userId: string, currentUserId: string) => {
        const sentRequest = requests.find(
            r => r.sender_id === currentUserId && r.receiver_id === userId
        );
        const receivedRequest = requests.find(
            r => r.sender_id === userId && r.receiver_id === currentUserId
        );

        if (sentRequest) {
            return { type: 'sent', status: sentRequest.status, requestId: sentRequest.id };
        }
        if (receivedRequest) {
            return { type: 'received', status: receivedRequest.status, requestId: receivedRequest.id };
        }
        return { type: 'none', status: null, requestId: null };
    };

    return {
        requests,
        isLoading,
        sendRequest,
        acceptRequest,
        denyRequest,
        cancelRequest,
        getConnectionStatus,
    };
}
