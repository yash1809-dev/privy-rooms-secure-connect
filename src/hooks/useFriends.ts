import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Friend {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

export function useFriends() {
    // Fetch list of accepted friends
    const { data: friends = [], isLoading } = useQuery({
        queryKey: ['friends'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Get all accepted friend requests where user is either sender or receiver
            const { data: requests, error } = await (supabase as any)
                .from('friend_requests')
                .select('sender_id, receiver_id')
                .eq('status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) throw error;
            if (!requests || requests.length === 0) return [];

            // Extract friend IDs (the other person in each connection)
            const friendIds = requests.map((r: any) =>
                r.sender_id === user.id ? r.receiver_id : r.sender_id
            );

            // Fetch friend profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, email, avatar_url')
                .in('id', friendIds);

            if (profileError) throw profileError;
            return (profiles || []) as Friend[];
        },
        staleTime: 60 * 1000, // 1 minute
    });

    return {
        friends,
        isLoading,
    };
}
