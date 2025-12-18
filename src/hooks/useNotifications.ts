import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    read: boolean;
    created_at: string;
}

export function useNotifications() {
    const queryClient = useQueryClient();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await (supabase as any)
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Notification[];
        },
        staleTime: 10 * 1000, // 10 seconds
    });

    // Subscribe to real-time notifications
    useEffect(() => {
        let channel: any;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('[Notifications] New notification:', payload.new);
                        // Optimistic insert
                        queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
                            return [payload.new as Notification, ...old];
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('[Notifications] Notification updated:', payload.new);
                        // Optimistic update
                        queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
                            return old.map(n =>
                                n.id === payload.new.id ? payload.new as Notification : n
                            );
                        });
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [queryClient]);

    // Mark as read with optimistic update
    const markAsRead = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await (supabase as any)
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onMutate: async (notificationId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            // Snapshot previous value
            const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

            // Optimistically update
            queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
                return old.map(n =>
                    n.id === notificationId ? { ...n, read: true } : n
                );
            });

            return { previousNotifications };
        },
        onError: (err, notificationId, context) => {
            // Rollback on error
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications'], context.previousNotifications);
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read with optimistic update
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await (supabase as any)
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

            // Mark all as read optimistically
            queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
                return old.map(n => ({ ...n, read: true }));
            });

            return { previousNotifications };
        },
        onError: (err, variables, context) => {
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications'], context.previousNotifications);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        isLoading,
        unreadCount,
        markAsRead,
        markAllAsRead,
    };
}
