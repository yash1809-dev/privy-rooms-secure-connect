import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface VideoCall {
    id: string;
    initiator_id: string;
    call_type: 'one-on-one' | 'group';
    status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
    started_at: string;
    ended_at?: string;
}

interface CallParticipant {
    id: string;
    call_id: string;
    user_id: string;
    status: 'invited' | 'joined' | 'declined' | 'left';
    joined_at?: string;
}

export function useVideoCalls() {
    const queryClient = useQueryClient();
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [incomingCallId, setIncomingCallId] = useState<string | null>(null);

    // Subscribe to incoming call notifications
    useEffect(() => {
        let mounted = true;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;

            console.log('Setting up video call notification subscription for user:', user.id);

            const channel = supabase
                .channel(`video_call_notifications_${user.id}`)
                .on(
                    'postgres_changes' as any,
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    async (payload: any) => {
                        console.log('Notification received:', payload);

                        if (payload.new && payload.new.type === 'video_call') {
                            const callData = payload.new.data as any;
                            console.log('Incoming video call from:', callData?.initiator_username);

                            setIncomingCallId(callData?.call_id);

                            toast.info(`Incoming call from ${callData?.initiator_username || 'Someone'}`, {
                                duration: 30000, // 30 seconds
                                action: {
                                    label: 'Answer',
                                    onClick: () => setActiveCallId(callData?.call_id),
                                },
                            });
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Video call subscription status:', status);
                });
        };

        setupSubscription();

        return () => {
            mounted = false;
        };
    }, []);

    // Start a video call
    const startCall = useMutation({
        mutationFn: async ({ participantIds, callType = 'group' }: { participantIds: string[]; callType?: 'one-on-one' | 'group' }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            console.log('Starting call with participants:', participantIds);

            // Create call
            const { data: call, error: callError } = await (supabase as any)
                .from('video_calls')
                .insert({
                    initiator_id: user.id,
                    call_type: callType,
                    status: 'ringing',
                })
                .select()
                .single();

            if (callError) {
                console.error('Error creating call:', callError);
                throw callError;
            }

            console.log('Call created:', call);

            // Add participants
            const participants = participantIds.map(participantId => ({
                call_id: call.id,
                user_id: participantId,
                status: 'invited',
            }));

            // Also add initiator as joined
            participants.push({
                call_id: call.id,
                user_id: user.id,
                status: 'joined',
            });

            console.log('Adding participants:', participants);

            const { error: participantsError } = await (supabase as any)
                .from('video_call_participants')
                .insert(participants);

            if (participantsError) {
                console.error('Error adding participants:', participantsError);
                throw participantsError;
            }

            console.log('Participants added successfully');
            return call;
        },
        onSuccess: (call) => {
            console.log('Call started successfully:', call.id);
            setActiveCallId(call.id);
            toast.success("Call started!");
            queryClient.invalidateQueries({ queryKey: ['video-calls'] });
        },
        onError: (error: any) => {
            console.error('Failed to start call:', error);
            toast.error("Failed to start call: " + (error.message || "Unknown error"));
        },
    });

    // Join a call
    const joinCall = useMutation({
        mutationFn: async (callId: string) => {
            console.log('Joining call:', callId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            console.log('User joining:', user.id);

            const { error } = await (supabase as any)
                .from('video_call_participants')
                .update({
                    status: 'joined',
                    joined_at: new Date().toISOString(),
                })
                .eq('call_id', callId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error updating participant status:', error);
                throw error;
            }

            console.log('Participant status updated to joined');

            // Update call status to ongoing
            await (supabase as any)
                .from('video_calls')
                .update({ status: 'ongoing' })
                .eq('id', callId);

            console.log('Call status updated to ongoing');
            return callId;
        },
        onSuccess: (callId) => {
            console.log('Join call successful, setting activeCallId:', callId);
            setActiveCallId(callId);
            setIncomingCallId(null);
            toast.success("Joined call!");
            queryClient.invalidateQueries({ queryKey: ['video-calls'] });
        },
        onError: (error: any) => {
            console.error('Failed to join call:', error);
            toast.error("Failed to join call: " + (error.message || "Unknown error"));
        },
    });

    // Decline a call
    const declineCall = useMutation({
        mutationFn: async (callId: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await (supabase as any)
                .from('video_call_participants')
                .update({ status: 'declined' })
                .eq('call_id', callId)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            setIncomingCallId(null);
            queryClient.invalidateQueries({ queryKey: ['video-calls'] });
        },
    });

    // End a call
    const endCall = useMutation({
        mutationFn: async (callId: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Mark user as left
            await (supabase as any)
                .from('video_call_participants')
                .update({
                    status: 'left',
                    left_at: new Date().toISOString(),
                })
                .eq('call_id', callId)
                .eq('user_id', user.id);

            // If initiator, end the call
            const { data: call } = await (supabase as any)
                .from('video_calls')
                .select('initiator_id')
                .eq('id', callId)
                .single();

            if (call && call.initiator_id === user.id) {
                await (supabase as any)
                    .from('video_calls')
                    .update({
                        status: 'ended',
                        ended_at: new Date().toISOString(),
                    })
                    .eq('id', callId);
            }
        },
        onSuccess: () => {
            setActiveCallId(null);
            queryClient.invalidateQueries({ queryKey: ['video-calls'] });
        },
    });

    // Get participants for active call
    const { data: activeCallParticipants = [] } = useQuery({
        queryKey: ['call-participants', activeCallId],
        queryFn: async () => {
            if (!activeCallId) return [];

            console.log('Fetching participants for call:', activeCallId);

            const { data, error } = await (supabase as any)
                .from('video_call_participants')
                .select('user_id, status')
                .eq('call_id', activeCallId)
                .in('status', ['invited', 'joined']);

            if (error) {
                console.error('Error fetching participants:', error);
                throw error;
            }

            const userIds = data.map((p: any) => p.user_id);
            console.log('Active call participants:', userIds);
            return userIds;
        },
        enabled: !!activeCallId,
        refetchInterval: 2000, // Refresh every 2 seconds to pick up new joiners
    });

    return {
        activeCallId,
        setActiveCallId,
        incomingCallId,
        activeCallParticipants,
        startCall,
        joinCall,
        declineCall,
        endCall,
    };
}
