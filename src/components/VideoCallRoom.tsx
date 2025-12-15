import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface Participant {
    id: string;
    username: string;
    stream?: MediaStream;
}

interface VideoCallRoomProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    callId: string | null;
    participants: string[];
}

export function VideoCallRoom({
    open,
    onOpenChange,
    callId,
    participants,
}: VideoCallRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [participantDetails, setParticipantDetails] = useState<Map<string, Participant>>(new Map());

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const realtimeChannel = useRef<any>(null);
    const initializedRef = useRef(false);

    // Initialize call once when opened
    useEffect(() => {
        console.log('VideoCallRoom effect - open:', open, 'callId:', callId);
        if (open && callId && !initializedRef.current) {
            initializedRef.current = true;
            initializeCall();
        }

        if (!open) {
            initializedRef.current = false;
            cleanup();
        }

        return () => {
            if (!open) {
                cleanup();
            }
        };
    }, [open, callId]);

    // Handle new participants joining
    useEffect(() => {
        if (!open || !callId || !localStream) return;

        console.log('Checking for new participants:', participants);

        // Create connections for any new participants
        const createNewConnections = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            for (const participantId of participants) {
                if (participantId !== user.id && !peerConnections.current.has(participantId)) {
                    console.log('Creating connection for new participant:', participantId);
                    await createPeerConnection(participantId, localStream);
                }
            }
        };

        createNewConnections();
    }, [participants, open, callId, localStream]);

    const initializeCall = async () => {
        try {
            console.log('Initializing call...');

            // Get local media stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            console.log('Got local media stream');
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Load participant details
            await loadParticipantDetails();

            // Set up Supabase Realtime for signaling
            await setupSignaling();

        } catch (error: any) {
            console.error('Failed to initialize call:', error);
            toast.error("Failed to access camera/microphone: " + error.message);
            initializedRef.current = false;
        }
    };

    const loadParticipantDetails = async () => {
        try {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username")
                .in("id", participants);

            const details = new Map<string, Participant>();
            profiles?.forEach((profile) => {
                details.set(profile.id, {
                    id: profile.id,
                    username: profile.username,
                });
            });
            setParticipantDetails(details);
        } catch (error) {
            console.error("Failed to load participant details:", error);
        }
    };

    const setupSignaling = async () => {
        if (!callId) return;

        const channel = supabase.channel(`video_call:${callId}`);

        channel
            .on("broadcast", { event: "offer" }, async ({ payload }) => {
                await handleOffer(payload);
            })
            .on("broadcast", { event: "answer" }, async ({ payload }) => {
                await handleAnswer(payload);
            })
            .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
                await handleIceCandidate(payload);
            })
            .subscribe();

        realtimeChannel.current = channel;
    };

    const createPeerConnection = async (participantId: string, stream: MediaStream) => {
        const configuration: RTCConfiguration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        };

        const peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
        });

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStreams((prev) => {
                const updated = new Map(prev);
                updated.set(participantId, remoteStream);
                return updated;
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && realtimeChannel.current) {
                realtimeChannel.current.send({
                    type: "broadcast",
                    event: "ice_candidate",
                    payload: {
                        candidate: event.candidate,
                        from: participantId,
                    },
                });
            }
        };

        peerConnections.current.set(participantId, peerConnection);

        // Create and send offer
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id < participantId) {
            // Only lower ID initiates to avoid duplicate offers
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            if (realtimeChannel.current) {
                realtimeChannel.current.send({
                    type: "broadcast",
                    event: "offer",
                    payload: {
                        offer: offer,
                        from: user.id,
                        to: participantId,
                    },
                });
            }
        }
    };

    const handleOffer = async (payload: any) => {
        const { offer, from } = payload;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !localStream) return;

        const peerConnection = peerConnections.current.get(from) || new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        });

        if (!peerConnections.current.has(from)) {
            localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = (event) => {
                const [remoteStream] = event.streams;
                setRemoteStreams((prev) => {
                    const updated = new Map(prev);
                    updated.set(from, remoteStream);
                    return updated;
                });
            };

            peerConnections.current.set(from, peerConnection);
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        if (realtimeChannel.current) {
            realtimeChannel.current.send({
                type: "broadcast",
                event: "answer",
                payload: {
                    answer: answer,
                    from: user.id,
                    to: from,
                },
            });
        }
    };

    const handleAnswer = async (payload: any) => {
        const { answer, from } = payload;
        const peerConnection = peerConnections.current.get(from);

        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleIceCandidate = async (payload: any) => {
        const { candidate, from } = payload;
        const peerConnection = peerConnections.current.get(from);

        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = async () => {
        console.log('Ending call...');

        // Close the dialog immediately (don't wait for DB updates)
        onOpenChange(false);

        // Cleanup resources
        cleanup();

        // Update database in background (don't wait)
        if (callId) {
            (supabase as any)
                .from("video_calls")
                .update({ status: "ended", ended_at: new Date().toISOString() })
                .eq("id", callId)
                .then(() => console.log('Call marked as ended in DB'))
                .catch((err: any) => console.error('Error updating call status:', err));
        }
    };

    const cleanup = () => {
        console.log('Cleaning up video call...');

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            setLocalStream(null);
        }

        // Close all peer connections
        peerConnections.current.forEach((pc, participantId) => {
            console.log('Closing peer connection for:', participantId);
            pc.close();
        });
        peerConnections.current.clear();

        // Unsubscribe from realtime channel
        if (realtimeChannel.current) {
            console.log('Unsubscribing from realtime channel');
            supabase.removeChannel(realtimeChannel.current);
            realtimeChannel.current = null;
        }

        setRemoteStreams(new Map());
        console.log('Cleanup complete');
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) endCall(); }}>
            <DialogContent className="sm:max-w-4xl h-[600px] p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Video Call</DialogTitle>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-2 gap-2 p-4 overflow-auto">
                    {/* Local Video */}
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                            You {isCameraOff && "(Camera Off)"}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {Array.from(remoteStreams.entries()).map(([participantId, stream]) => (
                        <RemoteVideo
                            key={participantId}
                            stream={stream}
                            username={participantDetails.get(participantId)?.username || "Unknown"}
                        />
                    ))}

                    {/* Empty placeholders if less than 4 participants */}
                    {Array.from({ length: Math.max(0, 3 - remoteStreams.size) }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="bg-muted rounded-lg flex items-center justify-center aspect-video"
                        >
                            <p className="text-muted-foreground text-sm">Waiting for participant...</p>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 p-4 border-t">
                    <Button
                        variant={isMuted ? "destructive" : "outline"}
                        size="icon"
                        onClick={toggleMute}
                        className="h-12 w-12 rounded-full"
                    >
                        {isMuted ? <MicOff /> : <Mic />}
                    </Button>

                    <Button
                        variant={isCameraOff ? "destructive" : "outline"}
                        size="icon"
                        onClick={toggleCamera}
                        className="h-12 w-12 rounded-full"
                    >
                        {isCameraOff ? <VideoOff /> : <Video />}
                    </Button>

                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={endCall}
                        className="h-12 w-12 rounded-full"
                    >
                        <PhoneOff />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RemoteVideo({ stream, username }: { stream: MediaStream; username: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                {username}
            </div>
        </div>
    );
}
