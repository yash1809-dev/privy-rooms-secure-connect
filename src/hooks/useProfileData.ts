import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfileData() {
    return useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, email, avatar_url, coffee_url, bio, links')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            // Fetch followers
            const { data: followerJoins } = await supabase
                .from('follows')
                .select('follower_id')
                .eq('following_id', user.id);

            // Fetch following
            const { data: followingJoins } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

            const followerIds = (followerJoins || []).map((j: any) => j.follower_id);
            const followingIds = (followingJoins || []).map((j: any) => j.following_id);

            // Fetch follower profiles
            const followersData = followerIds.length > 0
                ? await supabase.from('profiles').select('id, username, email, avatar_url').in('id', followerIds)
                : { data: [] };

            // Fetch following profiles
            const followingData = followingIds.length > 0
                ? await supabase.from('profiles').select('id, username, email, avatar_url').in('id', followingIds)
                : { data: [] };

            return {
                me: profile,
                followers: followersData.data || [],
                following: followingData.data || [],
            };
        },
        staleTime: 5 * 60 * 1000,
    });
}
