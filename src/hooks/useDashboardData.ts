import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
    profile: {
        username: string;
        email: string;
        avatar_url: string | null;
    };
}

export function useDashboardData() {
    return useQuery({
        queryKey: ['dashboard'],
        queryFn: async (): Promise<DashboardData> => {
            console.log('[Dashboard] Fetching user data...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) {
                console.error('[Dashboard] Auth error:', userError);
                throw userError;
            }

            if (!user) {
                console.error('[Dashboard] No user found');
                throw new Error("Not authenticated");
            }

            console.log('[Dashboard] User found:', user.id);

            const { data, error } = await supabase
                .from("profiles")
                .select("username, email, avatar_url")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error('[Dashboard] Profile fetch error:', error);
                throw error;
            }

            console.log('[Dashboard] Profile loaded successfully');
            return { profile: data };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 3, // Retry 3 times on failure
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    });
}
