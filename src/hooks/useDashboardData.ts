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
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("username, email, avatar_url")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            return { profile: data };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}
