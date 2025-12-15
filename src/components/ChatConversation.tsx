import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { getCroppedImg } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, BarChart3, Mic, Square, Plus, Smile, FileText, Image as ImageIcon, MoreVertical, Trash2, Download, CheckCheck, ArrowLeft } from "lucide-react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";

interface ProfileRow {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null
}

interface ChatConversationProps {
    groupId: string;
    onBack?: () => void;
    isMobile?: boolean;
}

const isEmojiOnly = (text: string): boolean => {
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+(\s*)$/u;
    return emojiRegex.test(text.trim());
};

// ... (imports)
import { usePresence } from "@/hooks/usePresence";
import { FileAttachment } from "./FileAttachment";
import { format } from "date-fns";

// ... (interfaces)
interface ChatConversationProps {
    groupId: string;
    onBack?: () => void;
    isMobile?: boolean;
    initialGroupData?: {
        name: string;
        avatar_url: string | null;
    };
}

export function ChatConversation({ groupId, onBack, isMobile = false, initialGroupData }: ChatConversationProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Initialize group state with instant data if available
    const [group, setGroup] = useState<any>(initialGroupData || null);

    // Update group state immediately when groupId changes or initialGroupData updates
    useEffect(() => {
        if (initialGroupData) {
            setGroup(prev => ({
                ...prev,
                ...initialGroupData,
                id: groupId
            }));
        }
    }, [initialGroupData, groupId]);

    const [text, setText] = useState("");
    const { messages, sendMessage: sendChatMessage, isLoading: messagesLoading } = useChatMessages(groupId);
    const { typingUsers, setTyping, clearTyping } = useTypingIndicator(groupId);

    // ... (existing state)
    // New state for presence
    // State Declarations
    // const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Handled by usePresence
    const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
    const [members, setMembers] = useState<ProfileRow[]>([]);
    const [followers, setFollowers] = useState<ProfileRow[]>([]);
    const [following, setFollowing] = useState<ProfileRow[]>([]);
    const [me, setMe] = useState<ProfileRow | null>(null);
    const [pollDialogOpen, setPollDialogOpen] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [slideOffset, setSlideOffset] = useState(0);
    const [touchStartX, setTouchStartX] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [viewAvatar, setViewAvatar] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [messageReadReceipts, setMessageReadReceipts] = useState<Map<string, number>>(new Map());
    const prevMessageCountRef = useRef(0);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);

    // Audio Playback
    // Audio Playback
    // Helper ref to track which URL is currently loaded in audioRef
    const currentAudioUrlRef = useRef<string | null>(null);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);

    const toggleAudioPlay = (messageId: string, audioUrl: string) => {
        if (playingAudioId === messageId) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
            setPlaybackTime(0);
        } else {
            // If playing a different audio, pause the current one
            if (playingAudioId !== null && playingAudioId !== messageId) {
                audioRef.current?.pause();
                setPlaybackTime(0);
            }

            // Reuse existing audio object if URL matches to prevent delay/re-buffering
            if (!audioRef.current || currentAudioUrlRef.current !== audioUrl) {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                }
                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                currentAudioUrlRef.current = audioUrl;

                // Capture duration when metadata loads
                audio.onloadedmetadata = () => {
                    setAudioDuration(audio.duration);
                };

                audio.ontimeupdate = () => {
                    setPlaybackTime(audio.currentTime);
                };

                audio.onended = () => {
                    setPlayingAudioId(null);
                    setPlaybackTime(0);
                };
                audio.onerror = () => {
                    toast.error("Failed to play audio");
                    setPlayingAudioId(null);
                    setPlaybackTime(0);
                };
            }

            // Play the audio (whether new or existing)
            audioRef.current?.play().catch(e => console.error("Audio play error:", e));
            setPlayingAudioId(messageId);
        }
    };

    // Helper functions need to be defined before they are used in load()
    const markMessagesAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || messages.length === 0) return;
            const unreadMessages = messages.filter(m => m.sender_id !== user.id);
            const receipts = unreadMessages.map(m => ({ message_id: m.id, user_id: user.id, read_at: new Date().toISOString() }));
            if (receipts.length > 0) {
                await (supabase as any).from("message_read_receipts").upsert(receipts, { onConflict: "message_id,user_id", ignoreDuplicates: true });
            }
        } catch (error) {
            console.error("Failed to mark messages as read:", error);
        }
    };

    const loadMembers = async () => {
        const { data } = await supabase.from("group_members").select("user_id, profiles(*)").eq("group_id", groupId);
        if (data) setMembers(data.map((m: any) => m.profiles).filter(Boolean));
    };

    const loadFollowLists = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get all accepted friend requests where user is either sender or receiver
            const { data: requests, error } = await (supabase as any)
                .from('friend_requests')
                .select('sender_id, receiver_id')
                .eq('status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) {
                console.error("Error loading friends:", error);
                setFollowers([]);
                setFollowing([]);
                return;
            }

            if (!requests || requests.length === 0) {
                setFollowers([]);
                setFollowing([]);
                return;
            }

            // Extract friend IDs (the other person in each connection)
            const friendIds = requests.map((r: any) =>
                r.sender_id === user.id ? r.receiver_id : r.sender_id
            );

            // Fetch profile data for friends
            const { data: profiles, error: profileError } = await supabase
                .from("profiles")
                .select("id, username, avatar_url, email")
                .in("id", friendIds);

            if (profileError) {
                console.error("Error loading friend profiles:", profileError);
                setFollowers([]);
                setFollowing([]);
                return;
            }

            const friends = profiles || [];

            // For compatibility, set both followers and following to the same friends list
            setFollowers(friends);
            setFollowing(friends);
        } catch (error) {
            console.error("Failed to load friends:", error);
            setFollowers([]);
            setFollowing([]);
        }
    };

    // Load Data
    const load = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }

            // Load Me
            const { data: meData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setMe(meData);

            // Load Group Details (if not fully loaded)
            if (!group) {
                const { data: groupData, error: groupError } = await supabase
                    .from("groups")
                    .select("*")
                    .eq("id", groupId)
                    .single();
                if (groupData) setGroup(groupData);
            }

            loadMembers();
            loadFollowLists();
            markMessagesAsRead();
        } catch (error) {
            console.error("Error loading chat data:", error);
        }
    };

    useEffect(() => {
        load();
    }, [groupId]);

    // Use the new hook for Online Presence
    const { onlineUsers } = usePresence(`group_presence_${groupId}`, me?.id);

    // Subscribe to Typing Status (Existing + Improved)
    // Typing indicator is now handled by useTypingIndicator hook
    // Old subscription removed
    useEffect(() => {
        if (!groupId || !me) return;

        const channel = supabase.channel(`group_read_receipts_${groupId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_read_receipts' }, (payload: any) => {
                const newMessageId = payload.new.message_id;
                setMessageReadReceipts(prev => {
                    const currentCount = prev.get(newMessageId);
                    const newMap = new Map(prev);
                    newMap.set(newMessageId, (currentCount || 0) + 1);
                    return newMap;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [groupId, me?.id]);

    // Header Status Logic
    const getHeaderStatus = () => {
        if (typingUsers.length > 0) {
            const typers = typingUsers.map(t => t.username || "Someone");
            return <span className="text-green-500 font-medium animate-pulse">{typers.join(", ")} is typing...</span>;
        }

        const onlineCount = members.filter(m => onlineUsers.has(m.id)).length;
        if (onlineCount > 0) {
            // If 1-on-1 (2 members), show "Online". Else show count.
            if (members.length <= 2) return <span className="text-blue-500 font-medium">Online</span>;
            return <span className="text-blue-500 font-medium">{onlineCount} online</span>;
        }

        return <span className="text-muted-foreground">{members.length} members</span>;
    };


    useEffect(() => {
        if (!messages.length || !groupId) return;
        const loadReceipts = async () => {
            const messageIds = messages.map(m => m.id);
            const { data: receipts } = await (supabase as any)
                .from("message_read_receipts")
                .select("message_id")
                .in("message_id", messageIds);
            const readCounts = new Map<string, number>();
            (receipts || []).forEach((r: any) => {
                readCounts.set(r.message_id, (readCounts.get(r.message_id) || 0) + 1);
            });
            setMessageReadReceipts(readCounts);
        };
        loadReceipts();
    }, [messages.length, groupId]);

    useEffect(() => {
        if (!me) return;
        const isNewMessageFromMe = messages.length > 0 && messages[messages.length - 1].sender_id === me.id;
        const wasAtBottom = messagesEndRef.current && (messagesEndRef.current.getBoundingClientRect().top <= window.innerHeight + 100);
        if (prevMessageCountRef.current === 0 && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else if (messages.length > prevMessageCountRef.current) {
            if (isNewMessageFromMe || wasAtBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
        prevMessageCountRef.current = messages.length;
    }, [messages, me]);

    const handleScrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollToBottom(false);
    };



    const handleTyping = () => {
        setTyping(); // Uses the new hook - auto-clears after 3s
    };

    const sendMessage = async () => {
        if (!me || !groupId) return;
        const messageContent = text.trim();
        if (!messageContent && !audioBlob) return;
        try {
            if (audioBlob) {
                const fileName = `${groupId}/${me.id}/${Date.now()}.webm`;
                const { error: uploadError } = await supabase.storage.from("voice-notes").upload(fileName, audioBlob);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
                await sendChatMessage({ group_id: groupId, sender_id: me.id, content: "🎤 Voice message", audio_url: publicUrl, sender: me });
                setAudioBlob(null);
                setRecordingTime(0);
            } else {
                await sendChatMessage({ group_id: groupId, sender_id: me.id, content: messageContent, sender: me });
            }
            setText("");
            clearTyping(); // Clear typing indicator after sending
        } catch (error: any) {
            toast.error("Failed to send message");
        }
    };

    const createPoll = async () => {
        if (!me || !groupId) return;
        if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
            toast.error("Please provide a question and at least 2 options");
            return;
        }
        try {
            const pollData = {
                question: pollQuestion.trim(),
                options: pollOptions.filter(o => o.trim()).map(opt => ({ text: opt.trim(), votes: 0, voters: [] })),
                allow_multiple_votes: allowMultipleVotes
            };
            await sendChatMessage({ group_id: groupId, sender_id: me.id, content: `📊 Poll: ${pollQuestion}`, poll_data: pollData, sender: me });
            setPollQuestion("");
            setPollOptions(["", ""]);
            setAllowMultipleVotes(false);
            setPollDialogOpen(false);
            // Poll created silently
        } catch (error) {
            toast.error("Failed to create poll");
        }
    };

    const addMember = async (userId: string) => {
        try {
            await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
            loadMembers();
            // Member added silently
        } catch (error) {
            toast.error("Failed to add member");
        }
    };

    const removeMember = async (userId: string) => {
        try {
            await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
            loadMembers();
            // Member removed silently
        } catch (error) {
            toast.error("Failed to remove member");
        }
    };

    const saveSettings = async (updates: { name?: string; description?: string; avatar_url?: string | null }) => {
        try {
            await supabase.from("groups").update(updates).eq("id", groupId);
            setGroup((prev: any) => ({ ...prev, ...updates }));
            // Settings updated silently
        } catch (error) {
            toast.error("Failed to update settings");
        }
    };

    const handleGroupIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }
        const reader = new FileReader();
        reader.addEventListener("load", () => setCroppingImage(reader.result as string));
        reader.readAsDataURL(file);
        event.target.value = "";
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels);

    const uploadCroppedImage = async () => {
        if (!croppingImage || !croppedAreaPixels || !group) return;
        try {
            const croppedBlob = await getCroppedImg(croppingImage, croppedAreaPixels, rotation);
            if (!croppedBlob) throw new Error("Could not crop image");
            setUploadingIcon(true);
            const fileName = `${group.id}-${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, croppedBlob);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
            const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
            await saveSettings({ avatar_url: publicUrlWithTimestamp });
            setCroppingImage(null);
            setZoom(1);
            setRotation(0);
            setCrop({ x: 0, y: 0 });
            toast.success("Group icon updated!");
        } catch (error: any) {
            toast.error("Error updating group icon: " + error.message);
        } finally {
            setUploadingIcon(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (error) {
            toast.error("Failed to access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setSlideOffset(0);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setSlideOffset(0);
            setAudioBlob(null);
            setRecordingTime(0);
            audioChunksRef.current = [];
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            toast.info("Recording cancelled");
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isRecording) setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isRecording && touchStartX > 0) {
            const currentX = e.touches[0].clientX;
            const diff = touchStartX - currentX;
            if (diff > 0) {
                setSlideOffset(Math.min(diff, 150));
                if (diff > 150) cancelRecording();
            }
        }
    };

    const handleTouchEnd = () => {
        if (isRecording && slideOffset < 150) setSlideOffset(0);
        setTouchStartX(0);
    };

    const cancelVoiceNote = () => {
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setText((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const handleFileUpload = async (file: File, type: 'document' | 'photo') => {
        if (!groupId || !me) return;
        try {
            const maxSize = type === 'document' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
                return;
            }
            const bucket = type === 'document' ? 'chat-documents' : 'chat-photos';
            const fileName = `${groupId}/${me.id}/${Date.now()}_${file.name}`;
            toast.info('Uploading...');
            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
            await sendChatMessage({ group_id: groupId, sender_id: me.id, content: type === 'document' ? `📄 ${file.name}` : `📷 Photo`, file_url: publicUrl, file_type: file.type, file_name: file.name, file_size: file.size, sender: me });
            toast.success('File sent!');
            setAttachmentMenuOpen(false);
        } catch (error: any) {
            toast.error('Failed to upload file: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await supabase.from('group_messages').delete().eq('id', messageId);
            queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
            // Message deleted silently
        } catch (error: any) {
            toast.error('Failed to delete message');
        }
    };

    const headerContent = (
        <CardHeader className="flex-shrink-0 p-3 pb-3 space-y-0 border-b">
            <div className="flex items-center gap-2 flex-1">
                {(isMobile || onBack) && (
                    <Button variant="ghost" size="icon" onClick={onBack || (() => navigate("/chats"))} className="h-8 w-8 -ml-1">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-accent/50 rounded-lg p-1.5 transition-colors" onClick={() => setShowGroupInfo(true)}>
                    <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage src={group?.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback>{group?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base leading-tight truncate">{group?.name}</div>
                        {typingUsers.length > 0 ? (
                            <p className="text-xs text-green-500 font-medium animate-pulse truncate">
                                {typingUsers.map(t => t.username || "Someone").join(", ")} is typing...
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground truncate">{members.length} members</p>
                        )}
                    </div>
                </div>
            </div>
            {group?.description && <CardDescription className="mt-1 px-1 line-clamp-1 text-xs">{group?.description}</CardDescription>}
        </CardHeader>
    );

    // Render messages - extracted for readability
    const messagesContent = messages.map((m) => {
        const isOwnMessage = me && m.sender_id === me.id;
        return (
            <div key={m.id} className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} group`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={m.sender?.avatar_url || undefined} />
                    <AvatarFallback>{m.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[70%] relative ${isOwnMessage ? 'items-end' : 'items-start'}`} onMouseEnter={() => setHoveredMessageId(m.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                    <div className={`relative rounded-lg ${!m.audio_url && !m.file_url && !m.poll_data && isEmojiOnly(m.content) && Array.from(m.content.trim()).length <= 2 ? 'p-0 bg-transparent' : `p-3 ${m.audio_url ? 'bg-green-100 dark:bg-green-900/30' : isOwnMessage ? 'bg-green-100 dark:bg-green-900/30' : 'bg-white dark:bg-gray-800'}`}`}>
                        {!isOwnMessage && <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{m.sender?.username || 'Unknown'}</div>}
                        {m.audio_url && (
                            <div className="flex items-center gap-3 py-2 w-[280px]">
                                <button onClick={() => toggleAudioPlay(m.id, m.audio_url)} className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-500/20 hover:bg-gray-500/30 flex items-center justify-center transition-colors">
                                    {playingAudioId === m.id ? (
                                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                                <div className="flex-1 flex items-center justify-center gap-1 h-8">
                                    {[12, 18, 24, 30, 20, 16, 28, 32, 22, 14, 26, 34, 18, 12, 24, 30, 20, 28, 16, 22].map((height, i) => {
                                        const progress = playingAudioId === m.id && audioDuration > 0 ? playbackTime / audioDuration : 0;
                                        const totalBars = 20;
                                        const barProgress = i / totalBars;
                                        const isFilled = barProgress <= progress;
                                        return (
                                            <div
                                                key={i}
                                                className="w-1 rounded-full transition-colors duration-300 ease-in-out"
                                                style={{
                                                    height: `${height}px`,
                                                    backgroundColor: isFilled ? 'rgb(107, 114, 128)' : 'rgba(156, 163, 175, 0.4)'
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium min-w-[50px] text-right">
                                    {playingAudioId === m.id
                                        ? `${Math.floor(playbackTime / 60)}:${Math.floor(playbackTime % 60).toString().padStart(2, '0')} / ${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')}`
                                        : audioDuration > 0
                                            ? `${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')}`
                                            : '0:00'
                                    }
                                </div>
                            </div>
                        )}
                        {m.file_url && !m.audio_url && (
                            <FileAttachment
                                fileUrl={m.file_url}
                                fileName={m.file_name || undefined}
                                fileType={m.file_type || undefined}
                                fileSize={m.file_size || undefined}
                                content={m.content}
                            />
                        )}
                        {m.poll_data && (
                            <div className="space-y-3 w-[280px]">
                                <div className="font-semibold text-sm">{m.poll_data.question}</div>
                                <div className="space-y-2">
                                    {m.poll_data.options?.map((option: any, idx: number) => {
                                        const totalVotes = m.poll_data.options?.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0) || 0;
                                        const percentage = totalVotes > 0 ? Math.round((option.votes || 0) / totalVotes * 100) : 0;
                                        return (
                                            <button key={idx} className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative overflow-hidden" onClick={async () => {
                                                try {
                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    if (!user) { toast.error('Please login to vote'); return; }
                                                    const newPollData = { ...m.poll_data };
                                                    const allowMultiple = newPollData.allow_multiple_votes;
                                                    const alreadyVotedForThis = newPollData.options[idx]?.voters?.includes(user.id);
                                                    if (alreadyVotedForThis) { toast.error('You already voted for this option'); return; }
                                                    if (!allowMultiple) {
                                                        newPollData.options = newPollData.options.map((opt: any) => {
                                                            const voters = opt.voters || [];
                                                            if (voters.includes(user.id)) return { ...opt, votes: Math.max((opt.votes || 0) - 1, 0), voters: voters.filter((v: string) => v !== user.id) };
                                                            return opt;
                                                        });
                                                    }
                                                    newPollData.options = newPollData.options.map((opt: any, i: number) => {
                                                        if (i === idx) {
                                                            const voters = opt.voters || [];
                                                            return { ...opt, votes: (opt.votes || 0) + 1, voters: [...voters, user.id] };
                                                        }
                                                        return opt;
                                                    });
                                                    await supabase.from('group_messages').update({ poll_data: newPollData } as any).eq('id', m.id);
                                                    queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
                                                    // Vote recorded silently
                                                } catch (error) {
                                                    toast.error('Failed to vote');
                                                }
                                            }}>
                                                <div className="absolute inset-0 bg-teal-100 dark:bg-teal-900/30 transition-all duration-300" style={{ width: `${percentage}%` }} />
                                                <div className="relative flex items-center justify-between">
                                                    <span className="text-sm font-medium">{option.text}</span>
                                                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{percentage}% ({option.votes || 0})</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="text-xs text-muted-foreground">{m.poll_data.options?.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0) || 0} votes</div>
                            </div>
                        )}
                        {!m.audio_url && !m.file_url && !m.poll_data && (
                            <div className={`break-words whitespace-pre-wrap ${isEmojiOnly(m.content) ? (Array.from(m.content.trim()).length <= 2 ? 'text-6xl leading-tight' : 'text-4xl leading-relaxed') : 'text-sm'}`}>{m.content}</div>
                        )}
                        <div className={`flex items-center gap-1 justify-end mt-1 ${!m.audio_url && !m.file_url && !m.poll_data && isEmojiOnly(m.content) && Array.from(m.content.trim()).length <= 2 ? 'bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-full text-white inline-flex self-end ml-auto' : ''}`}>
                            <span className={`text-xs ${!m.audio_url && !m.file_url && !m.poll_data && isEmojiOnly(m.content) && Array.from(m.content.trim()).length <= 2 ? 'text-white/90' : 'text-muted-foreground'}`}>
                                {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                            </span>
                            {isOwnMessage && (
                                <>
                                    {m.status === 'failed' ? (
                                        <span className="text-[10px] text-red-500 font-medium">Failed</span>
                                    ) : (
                                        <>
                                            {(() => {
                                                const readCount = messageReadReceipts.get(m.id) || 0;
                                                const membersCount = members.length || 1;
                                                const needed = Math.max(0, membersCount - 1);
                                                const isReadByAll = readCount >= needed;
                                                return isReadByAll ? (
                                                    <CheckCheck className={`h-3 w-3 ${!m.audio_url && !m.file_url && !m.poll_data && isEmojiOnly(m.content) && Array.from(m.content.trim()).length <= 2 ? 'text-blue-300' : 'text-blue-500'}`} />
                                                ) : (
                                                    <CheckCheck className={`h-3 w-3 ${!m.audio_url && !m.file_url && !m.poll_data && isEmojiOnly(m.content) && Array.from(m.content.trim()).length <= 2 ? 'text-white/70' : 'text-gray-400'}`} />
                                                );
                                            })()}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    {isOwnMessage && (
                        <div className="absolute top-0 -left-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className={`h-6 w-6 hover:bg-transparent transition-opacity ${hoveredMessageId === m.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleDeleteMessage(m.id)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>
        );
    });

    const layoutClass = isMobile ? "fixed inset-0 bg-background overflow-hidden" : "flex flex-col h-full bg-background";

    return (
        <div className={layoutClass}>
            <div className={isMobile ? "container mx-auto px-4 py-6 max-w-5xl h-full flex flex-col" : "flex flex-col h-full"}>
                <Card className="flex-1 flex flex-col overflow-hidden min-h-0 border-0 shadow-none">
                    {headerContent}
                    <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
                        <div className="flex-1 px-3 pt-3 pb-0 overflow-y-auto bg-background/50 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                            {!me ? <div className="flex items-center justify-center h-full" /> : (
                                <>
                                    {messages.length === 0 && <div className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</div>}
                                    {messagesContent}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                        <div className="space-y-2 px-3 pb-3">
                            {audioBlob && (
                                <div className="flex items-center gap-3 p-3 bg-accent rounded-lg border">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span className="text-sm font-medium">Voice message</span>
                                            <span className="text-xs text-muted-foreground">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                        <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
                                    </div>
                                    <Button size="icon" className="bg-green-600 hover:bg-green-700 text-white rounded-full h-12 w-12" onClick={sendMessage}>
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={cancelVoiceNote} className="h-12 w-12">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </Button>
                                </div>
                            )}
                            {isRecording && (
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg border border-red-200 dark:border-900 transition-transform touch-none" style={{ transform: `translateX(-${slideOffset}px)`, opacity: 1 - (slideOffset / 200) }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
                                        </div>
                                        <span className="text-sm font-medium text-red-600 dark:text-red-400">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center gap-1 h-8">
                                        {[...Array(20)].map((_, i) => (
                                            <div key={i} className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 24 + 8}px`, animationDelay: `${i * 0.05}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` }} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{slideOffset > 50 ? '🚫 Release to cancel' : '← Slide to cancel'}</span>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={stopRecording}>
                                            <Square className="h-4 w-4 fill-current" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 items-center mt-1">
                                <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 flex-shrink-0"><Plus className="h-5 w-5" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2">
                                        <div className="space-y-1">
                                            <label className="cursor-pointer">
                                                <div className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                                                    <FileText className="h-5 w-5 text-blue-500" />
                                                    <span>Document</span>
                                                </div>
                                                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'document'); }} />
                                            </label>
                                            <label className="cursor-pointer">
                                                <div className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                                                    <ImageIcon className="h-5 w-5 text-purple-500" />
                                                    <span>Photos</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, 'photo'); }} />
                                            </label>
                                            <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer">
                                                        <BarChart3 className="h-5 w-5 text-green-500" />
                                                        <span>Poll</span>
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Create Poll</DialogTitle>
                                                        <DialogDescription>Create a poll for the group to vote on</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="poll-question">Question</Label>
                                                            <Input id="poll-question" placeholder="What should we do?" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Options (at least 2)</Label>
                                                            {pollOptions.map((opt, idx) => (
                                                                <Input key={idx} placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} />
                                                            ))}
                                                            <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}>Add Option</Button>
                                                        </div>
                                                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                                            <input type="checkbox" id="allow-multiple-votes" checked={allowMultipleVotes} onChange={(e) => setAllowMultipleVotes(e.target.checked)} className="h4 w-4 rounded border-gray-300" />
                                                            <Label htmlFor="allow-multiple-votes" className="cursor-pointer flex-1">Allow multiple answer</Label>
                                                        </div>
                                                        <Button onClick={createPoll} className="w-full">Create Poll</Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex-1 relative">
                                    <Input placeholder="Type a message" value={text} onChange={(e) => { setText(e.target.value); handleTyping(); }} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="flex-1 rounded-full pr-12" disabled={isRecording || !!audioBlob} />
                                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full">
                                                <Smile className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0 border-0" align="end">
                                            <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {text.trim() || audioBlob ? (
                                    <Button onClick={sendMessage} disabled={isRecording} className="bg-green-600 hover:bg-green-700 text-white rounded-full h-10 w-10 p-0 flex-shrink-0" size="icon">
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" onClick={isRecording ? stopRecording : startRecording} title={isRecording ? "Stop recording" : "Record voice note"} className={`rounded-full h-10 w-10 flex-shrink-0 ${isRecording ? "bg-red-500 text-white hover:bg-red-600" : "hover:bg-accent"}`}>
                                        {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Dialog open={!!croppingImage} onOpenChange={(open) => !open && setCroppingImage(null)}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Edit Group Icon</DialogTitle>
                                    <DialogDescription>Crop and rotate your image.</DialogDescription>
                                </DialogHeader>
                                <div className="relative w-full h-64 bg-black/5 rounded-md overflow-hidden mt-4">
                                    {croppingImage && <Cropper image={croppingImage} crop={crop} zoom={zoom} rotation={rotation} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} onRotationChange={setRotation} />}
                                </div>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Zoom</Label>
                                        <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Rotation</Label>
                                        <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(value) => setRotation(value[0])} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" onClick={() => setCroppingImage(null)}>Cancel</Button>
                                    <Button onClick={uploadCroppedImage} disabled={uploadingIcon}>{uploadingIcon ? "Saving..." : "Save"}</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
                            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Group Info</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative group cursor-pointer" onClick={() => setViewAvatar(true)}>
                                            <Avatar className="h-24 w-24 border-2 border-border transition-transform active:scale-95">
                                                <AvatarImage src={group?.avatar_url || undefined} className="object-cover" />
                                                <AvatarFallback className="text-3xl">{group?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {uploadingIcon && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>}
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={uploadingIcon}>{uploadingIcon ? "Uploading..." : "Change Group Icon"}</Button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleGroupIconUpload} />
                                    </div>
                                    {viewAvatar && (
                                        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewAvatar(false)}>
                                            <div className="relative max-w-lg w-full aspect-square">
                                                {group?.avatar_url ? (
                                                    <img src={group.avatar_url} alt={group.name} className="w-full h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                                                ) : (
                                                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg" onClick={(e) => e.stopPropagation()}>
                                                        <span className="text-9xl text-muted-foreground font-semibold">{group?.name?.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                )}
                                                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full" onClick={() => setViewAvatar(false)}>
                                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <h3 className="font-medium text-sm text-muted-foreground">Group Details</h3>
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input placeholder="Group name" defaultValue={group?.name} onBlur={(e) => saveSettings({ name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Input placeholder="Group description" defaultValue={group?.description || ''} onBlur={(e) => saveSettings({ description: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-sm text-muted-foreground">Participants ({members.length})</h3>
                                            <Button variant="ghost" size="sm" onClick={() => setShowAddMember(true)}><Plus className="h-4 w-4 mr-2" />Add</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {members.map((p) => (
                                                <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={p.avatar_url || undefined} />
                                                            <AvatarFallback>{p.username[0].toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-sm">{p.username}</div>
                                                    </div>
                                                    <Button size="sm" variant="outline" onClick={() => removeMember(p.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Remove</Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Add Participants</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-2 max-h-[60vh] overflow-y-auto pt-4">
                                    {(!followers.length && !following.length) && <div className="text-sm text-muted-foreground p-2 text-center">No contacts found</div>}
                                    {(() => {
                                        // Deduplicate friends list by ID (followers and following have same data)
                                        const allFriends = [...followers, ...following];
                                        const uniqueFriends = allFriends.filter((friend, index, self) =>
                                            index === self.findIndex((f) => f.id === friend.id)
                                        );

                                        return uniqueFriends.map((p) => {
                                            // Check if user is already a member
                                            const isAlreadyMember = members.some(m => m.id === p.id);

                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`flex items-center justify-between p-2 rounded ${isAlreadyMember
                                                        ? 'bg-accent/30 opacity-60'
                                                        : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={p.avatar_url || undefined} />
                                                            <AvatarFallback>{p.username[0].toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-sm">{p.username}</div>
                                                    </div>
                                                    {isAlreadyMember ? (
                                                        <span className="text-xs text-muted-foreground px-3 py-1">Added</span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                addMember(p.id);
                                                                setShowAddMember(false);
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                    {showScrollToBottom && (
                        <div className="absolute bottom-20 right-4 z-50">
                            <Button onClick={handleScrollToBottom} className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90" size="sm">New Messages ⬇️</Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
