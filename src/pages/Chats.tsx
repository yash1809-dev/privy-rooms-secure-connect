import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Search, MoreVertical, Pin, Archive, PinOff, ArchiveRestore, Plus, Video, Phone, MessageSquare, Trash2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ContactSelectorDialog } from "@/components/ContactSelectorDialog";
import { VideoCallRoom } from "@/components/VideoCallRoom";
import { ChatsSkeleton } from "@/components/ChatsSkeleton";
import { useChatsData } from "@/hooks/useChatsData";
import { useQueryClient } from "@tanstack/react-query";
import { ChatConversation } from "@/components/ChatConversation";
import { NotificationBell } from "@/components/NotificationBell";
import { UserSearchDialog } from "@/components/UserSearchDialog";
import { useVideoCalls } from "@/hooks/useVideoCalls";
import { Footer } from "@/components/Footer";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

interface Group {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    created_at: string;
    is_pinned?: boolean;
    is_archived?: boolean;
}

interface GroupWithLastMessage extends Group {
    lastMessage?: {
        content: string;
        created_at: string;
        sender_name: string;
    };
    unreadCount: number;
}

interface VideoCall {
    id: string;
    creator_id: string;
    status: string;
    created_at: string;
    participants: string[];
}

export default function Chats() {
    const navigate = useNavigate();
    const { groupId } = useParams<{ groupId: string }>();
    const queryClient = useQueryClient();

    // Video calling hook
    const { activeCallId, activeCallParticipants, startCall, setActiveCallId } = useVideoCalls();

    // Browser notifications hook
    const { permission, requestPermission, showNotification, setActiveGroupId } = useBrowserNotifications();

    // Use React Query for data caching
    const { data: cachedData, isLoading: queriesLoading } = useChatsData();

    // Use cached data directly-don't copy to local state!
    // This ensures component re-renders when React Query cache updates
    const groups = cachedData?.groups || [];
    const loading = queriesLoading;

    const [filteredGroups, setFilteredGroups] = useState<GroupWithLastMessage[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"chats" | "calls">("chats");
    const [callHistory, setCallHistory] = useState<VideoCall[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [userSearchOpen, setUserSearchOpen] = useState(false);

    // Detect if mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Request notification permission on mount
    useEffect(() => {
        if (permission === 'default') {
            // Request permission after a short delay to not be intrusive
            const timer = setTimeout(() => {
                requestPermission();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [permission, requestPermission]);

    // Update active group for notification filtering
    useEffect(() => {
        setActiveGroupId(groupId || null);
    }, [groupId, setActiveGroupId]);

    // Store showNotification in a ref to avoid re-render loop
    const showNotificationRef = useRef(showNotification);
    useEffect(() => {
        showNotificationRef.current = showNotification;
    }, [showNotification]);

    // Store groups in a ref to avoid re-render loop
    const groupsRef = useRef(groups);
    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    // Store queryClient in a ref to use in subscription callbacks
    const queryClientRef = useRef(queryClient);
    useEffect(() => {
        queryClientRef.current = queryClient;
    }, [queryClient]);

    // Listen for new message events and show notifications
    // Uses refs to avoid dependency issues and infinite loops
    useEffect(() => {
        console.log("[Notifications] Setting up event listener (once)");

        const handleNewMessage = async (event: CustomEvent) => {
            console.log("[Notifications] 📨 Received new-message event:", event.detail);

            const { groupId: msgGroupId, senderName, content, audio_url, file_url } = event.detail;

            // Get group name for notification-use ref for latest value
            const group = groupsRef.current.find(g => g.id === msgGroupId);
            const groupName = group?.name || 'Unknown Group';

            console.log("[Notifications] Group found:", groupName, "for ID:", msgGroupId);

            // Format message preview
            let messagePreview = content;
            if (audio_url) {
                messagePreview = '🎤 Voice message';
            } else if (file_url) {
                messagePreview = '📎 Attachment';
            }

            // Show browser notification-use ref to avoid dependency
            await showNotificationRef.current({
                title: groupName,
                body: `${senderName}: ${messagePreview}`,
                icon: group?.avatar_url || undefined,
                tag: msgGroupId,
                data: { groupId: msgGroupId },
            });

            console.log("[Notifications] showNotification completed");
        };

        window.addEventListener('new-message', handleNewMessage as EventListener);
        console.log("[Notifications] Event listener registered");

        return () => {
            console.log("[Notifications] Cleaning up event listener");
            window.removeEventListener('new-message', handleNewMessage as EventListener);
        };
    }, []); // Empty dependency array-uses refs for latest values

    // Update filtered groups whenever groups or search changes
    useEffect(() => {
        const filtered = groups.filter((group: GroupWithLastMessage) => {
            const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesArchive = showArchived ? group.is_archived : !group.is_archived;
            return matchesSearch && matchesArchive;
        });
        setFilteredGroups(filtered);
    }, [groups, searchQuery, showArchived]);

    // Load groups and set up base subscriptions on mount
    useEffect(() => {
        console.log("[Chat List] Initial load");
        loadGroups();
        loadCallHistory();

        // REAL-TIME SUBSCRIPTION: Listen for group membership and group changes
        const channel = supabase
            .channel('chat-list-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'group_members',
                },
                async (payload) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && ((payload.new as any)?.user_id === user.id || (payload.old as any)?.user_id === user.id)) {
                        console.log("Real-time: Group membership changed, refetching groups");
                        queryClientRef.current.invalidateQueries({ queryKey: ['chats'] });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'groups',
                },
                () => {
                    console.log("Real-time: Group details changed, refetching groups");
                    queryClientRef.current.invalidateQueries({ queryKey: ['chats'] });
                }
            )
            .subscribe((status) => {
                console.log("[Chat List] Base subscription status:", status);
            });

        return () => {
            console.log("[Chat List] Cleaning up base subscriptions");
            supabase.removeChannel(channel);
        };
    }, []);

    // PER-GROUP SUBSCRIPTIONS: Subscribe to each group's messages for real-time chat list updates
    // This works with RLS because each subscription has a specific group_id filter
    useEffect(() => {
        if (!groups || groups.length === 0) return;

        console.log("[Chat List] Setting up per-group message subscriptions for", groups.length, "groups");

        const channels: ReturnType<typeof supabase.channel>[] = [];

        groups.forEach((group) => {
            const channel = supabase
                .channel(`chat-list-group-${group.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'group_messages',
                        filter: `group_id=eq.${group.id}` // Filter by group_id - works with RLS!
                    },
                    async (payload) => {
                        const newMessage = payload.new as any;
                        console.log("[Chat List] 📨 New message in group:", group.name, "-", newMessage.content?.substring(0, 20));

                        // Fetch sender info
                        const { data: senderData } = await supabase
                            .from('profiles')
                            .select('username')
                            .eq('id', newMessage.sender_id)
                            .single();

                        // Get current user to check if own message
                        const { data: { user } } = await supabase.auth.getUser();
                        const isOwnMessage = user?.id === newMessage.sender_id;

                        // Update chat list cache directly for instant update
                        queryClientRef.current.setQueryData(['chats'], (oldData: any) => {
                            if (!oldData?.groups) return oldData;

                            const updatedGroups = oldData.groups.map((g: any) => {
                                if (g.id === group.id) {
                                    console.log("[Chat List] ✅ Updating group:", g.name);
                                    return {
                                        ...g,
                                        lastMessage: {
                                            content: newMessage.content,
                                            created_at: newMessage.created_at,
                                            sender_name: senderData?.username || 'Unknown'
                                        },
                                        unreadCount: isOwnMessage ? g.unreadCount : (g.unreadCount || 0) + 1
                                    };
                                }
                                return g;
                            });

                            // Re-sort: pinned first, then by latest message
                            const sorted = [...updatedGroups].sort((a: any, b: any) => {
                                if (a.is_pinned && !b.is_pinned) return -1;
                                if (!a.is_pinned && b.is_pinned) return 1;
                                const aTime = a.lastMessage?.created_at || a.created_at;
                                const bTime = b.lastMessage?.created_at || b.created_at;
                                return new Date(bTime).getTime() - new Date(aTime).getTime();
                            });

                            return { groups: sorted };
                        });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("[Chat List] ✅ Subscribed to:", group.name);
                    }
                });

            channels.push(channel);
        });

        return () => {
            console.log("[Chat List] Cleaning up per-group subscriptions");
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [groups]); // Re-subscribe when groups change

    const loadGroups = async () => {
        // Invalidate cache and let React Query refetch
        await queryClient.invalidateQueries({ queryKey: ['chats'] });
        await queryClient.refetchQueries({ queryKey: ['chats'] });
    };

    const handleStartCall = async (selectedContactIds: string[]) => {
        console.log('handleStartCall called with:', selectedContactIds);
        try {
            console.log('Calling startCall.mutateAsync...');
            await startCall.mutateAsync({
                participantIds: selectedContactIds,
                callType: selectedContactIds.length === 1 ? 'one-on-one' : 'group',
            });
            console.log('startCall.mutateAsync completed successfully');
        } catch (error: any) {
            console.error("handleStartCall error:", error);
            toast.error("Error: " + (error?.message || JSON.stringify(error)));
        }
    };

    const handleJoinVideoCall = (callId: string) => {
        console.log('handleJoinVideoCall called with callId:', callId);
        setActiveCallId(callId);
    };

    const loadCallHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: calls } = await (supabase as any)
                .from("video_calls")
                .select("id, creator_id, status, created_at")
                .or(`creator_id.eq.${user.id} `)
                .order("created_at", { ascending: false })
                .limit(20);

            if (!calls) {
                setCallHistory([]);
                return;
            }

            const callsWithParticipants = await Promise.all(
                calls.map(async (call: any) => {
                    const { data: participants } = await (supabase as any)
                        .from("call_participants")
                        .select("user_id")
                        .eq("call_id", call.id);

                    return {
                        ...call,
                        participants: participants?.map((p: any) => p.user_id) || [],
                    };
                })
            );

            setCallHistory(callsWithParticipants);
        } catch (error) {
            console.error("Failed to load call history:", error);
        }
    };

    const togglePin = async (groupId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("group_members")
                .update({ is_pinned: !currentStatus } as any)
                .eq("group_id", groupId)
                .eq("user_id", user.id);

            if (error) throw error;

            // Update React Query cache instead of local state
            queryClient.setQueryData(['chats'], (oldData: any) => {
                if (!oldData?.groups) return oldData;

                const updatedGroups = oldData.groups.map((g: any) =>
                    g.id === groupId ? { ...g, is_pinned: !currentStatus } : g
                );

                // Re-sort: pinned first, then by time
                const sorted = [...updatedGroups].sort((a: any, b: any) => {
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    const aTime = a.lastMessage?.created_at || a.created_at;
                    const bTime = b.lastMessage?.created_at || b.created_at;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                });

                return { groups: sorted };
            });

            // Pinned/unpinned silently
        } catch (error) {
            toast.error("Failed to update pin status");
        }
    };

    const toggleArchive = async (groupId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("group_members")
                .update({ is_archived: !currentStatus } as any)
                .eq("group_id", groupId)
                .eq("user_id", user.id);

            if (error) throw error;

            // Update React Query cache
            queryClient.setQueryData(['chats'], (oldData: any) => {
                if (!oldData?.groups) return oldData;
                return {
                    groups: oldData.groups.map((g: any) =>
                        g.id === groupId ? { ...g, is_archived: !currentStatus } : g
                    )
                };
            });

            // Archived/unarchived silently
        } catch (error) {
            console.error("Failed to toggle archive:", error);
            toast.error("Failed to update chat");
        }
    };

    const deleteGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setGroupToDelete(groupId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!groupToDelete) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Delete group membership
            const { error: memberError } = await supabase
                .from("group_members")
                .delete()
                .eq("group_id", groupToDelete)
                .eq("user_id", user.id);

            if (memberError) throw memberError;

            // Update React Query cache
            queryClient.setQueryData(['chats'], (oldData: any) => {
                if (!oldData?.groups) return oldData;
                return {
                    groups: oldData.groups.filter((g: any) => g.id !== groupToDelete)
                };
            });

            // If we're viewing this chat, navigate back to chat list
            if (groupId === groupToDelete) {
                navigate('/chats', { replace: true });
            }

            // Deleted silently
        } catch (error) {
            console.error("Failed to delete chat:", error);
            toast.error("Failed to delete chat");
        } finally {
            setShowDeleteConfirm(false);
            setGroupToDelete(null);
        }
    };

    // Filter groups based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredGroups(groups);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = groups.filter(group =>
            group.name.toLowerCase().includes(query) ||
            group.lastMessage?.content.toLowerCase().includes(query) ||
            group.lastMessage?.sender_name.toLowerCase().includes(query)
        );
        setFilteredGroups(filtered);
    }, [searchQuery, groups]);

    const handleChatClick = (chatGroupId: string) => {
        if (isMobile) {
            // On mobile, navigate to full-screen chat
            navigate(`/chats/${chatGroupId}`);
        } else {
            // On desktop, update URL without full navigation
            navigate(`/chats/${chatGroupId}`, { replace: true });
        }
    };

    const handleBackToList = () => {
        navigate('/chats', { replace: true });
    };

    if (loading && groups.length === 0) {
        return <ChatsSkeleton />;
    }

    // Mobile: Show either chat list or conversation, not both
    if (isMobile && groupId) {
        return <ChatConversation groupId={groupId} onBack={handleBackToList} isMobile={true} />;
    }

    const chatListSidebar = (
        <aside className={`flex flex-col h-screen ${isMobile ? 'w-full' : 'w-[380px]'} bg-slate-950 text-white border-r border-white/10 overflow-hidden`}>
            {/* Mobile Tabs-shown only on mobile */}
            <div className="lg:hidden flex border-b border-white/10 bg-slate-900 text-slate-400">
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors relative ${activeTab === "chats" ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500" : "hover:bg-slate-800/50 hover:text-white"
                        } `}
                    onClick={() => setActiveTab("chats")}
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm font-medium">Chats</span>
                    {filteredGroups.filter(g => !g.is_archived).reduce((sum, g) => sum + g.unreadCount, 0) > 0 && (
                        <span className="h-2.5 w-2.5 bg-red-500 rounded-full" />
                    )}
                </button>
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors ${activeTab === "calls" ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500" : "hover:bg-slate-800/50 hover:text-white"
                        } `}
                    onClick={() => setActiveTab("calls")}
                >
                    <Phone className="h-5 w-5" />
                    <span className="text-sm font-medium">Calls</span>
                </button>
            </div>

            {/* Header */}
            <header className="bg-slate-900 border-b border-white/10">
                <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                            {!isMobile && (
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Chats</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Desktop: Search Icon */}
                            {!isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                                    onClick={() => setUserSearchOpen(true)}
                                >
                                    <UserPlus className="h-5 w-5" />
                                </Button>
                            )}

                            {/* Desktop: Notification Bell */}
                            {!isMobile && <NotificationBell onJoinCall={handleJoinVideoCall} />}

                            {/* Mobile: Notification Bell (outside dropdown) */}
                            {isMobile && <NotificationBell onJoinCall={handleJoinVideoCall} />}

                            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white">
                                    <DropdownMenuItem className="focus:bg-slate-800 focus:text-white" onSelect={() => {
                                        setDropdownOpen(false);
                                        setTimeout(() => setCreateGroupOpen(true), 100);
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" /> New Group
                                    </DropdownMenuItem>
                                    {/* Mobile: Add Friends Option */}
                                    {isMobile && (
                                        <DropdownMenuItem className="focus:bg-slate-800 focus:text-white" onClick={() => {
                                            setDropdownOpen(false);
                                            setUserSearchOpen(true);
                                        }}>
                                            <UserPlus className="mr-2 h-4 w-4" /> Add Friends
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="focus:bg-slate-800 focus:text-white" onClick={() => {
                                        setDropdownOpen(false);
                                        setShowArchived(true);
                                    }}>
                                        <Archive className="mr-2 h-4 w-4" /> Archived Chats
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-teal-500/20"
                        />
                    </div>
                </div>
            </header>

            {/* Desktop Tabs-always visible on desktop, hidden on mobile */}
            <div className="hidden lg:flex border-b border-white/10 bg-slate-900 text-slate-400">
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors relative ${activeTab === "chats" ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500" : "hover:bg-slate-800/50 hover:text-white"
                        } `}
                    onClick={() => setActiveTab("chats")}
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm font-medium">Chats</span>
                    {filteredGroups.filter(g => !g.is_archived).reduce((sum, g) => sum + g.unreadCount, 0) > 0 && (
                        <span className="h-2.5 w-2.5 bg-red-500 rounded-full" />
                    )}
                </button>
                <button
                    className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors ${activeTab === "calls" ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500" : "hover:bg-slate-800/50 hover:text-white"
                        } `}
                    onClick={() => setActiveTab("calls")}
                >
                    <Phone className="h-5 w-5" />
                    <span className="text-sm font-medium">Calls</span>
                </button>
            </div>

            {/* Chat List */}
            {activeTab === "chats" && (
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    {showArchived && (
                        <div className="bg-slate-900/50 p-2 flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white" onClick={() => setShowArchived(false)}>
                            <ArrowLeft className="h-4 w-4" />
                            Back to Chats
                        </div>
                    )}

                    {groups.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p>No chats yet. Create or join a group to start chatting!</p>
                        </div>
                    ) : (showArchived ? filteredGroups.filter(g => g.is_archived) : filteredGroups.filter(g => !g.is_archived)).length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p>{showArchived ? "No archived chats" : `No chats found matching "${searchQuery}"`}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {(showArchived ? filteredGroups.filter(g => g.is_archived) : filteredGroups.filter(g => !g.is_archived)).map((group) => (
                                <div
                                    key={group.id}
                                    className={`flex items-center gap-3 sm: gap-4 p-3 sm: p-4 border-b border-white/5 hover: bg-white/5 cursor-pointer transition-colors relative ${groupId === group.id ? 'bg-white/10' : ''} `}
                                    onClick={() => handleChatClick(group.id)}
                                    onMouseEnter={() => {
                                        // Prefetch messages on hover
                                        queryClient.prefetchQuery({
                                            queryKey: ['messages', group.id],
                                            queryFn: async () => {
                                                const { data, error } = await supabase
                                                    .from("group_messages")
                                                    .select("*, sender:profiles(id,username,email,avatar_url)")
                                                    .eq("group_id", group.id)
                                                    .order("created_at", { ascending: true });
                                                if (error) throw error;
                                                return data;
                                            },
                                            staleTime: 5 * 60 * 1000,
                                        });
                                    }}
                                >
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 border border-white/10">
                                        <AvatarImage src={group.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.id}`} className="object-cover" />
                                        <AvatarFallback className="bg-slate-800 text-teal-400">{group.name[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar >

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                            <h3 className="font-semibold truncate text-sm sm:text-base text-white">{group.name}</h3>
                                            {group.is_pinned && <Pin className="h-3 w-3 text-teal-500 fill-current flex-shrink-0" />}
                                            {group.is_archived && <Archive className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                                        </div>
                                        {group.lastMessage && (
                                            <p className="text-xs sm:text-sm text-slate-400 truncate">
                                                <span className="font-medium text-slate-300">{group.lastMessage.sender_name}:</span> {group.lastMessage.content}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
                                        {group.lastMessage && (
                                            <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">
                                                {formatDistanceToNow(new Date(group.lastMessage.created_at), { addSuffix: true })}
                                            </span>
                                        )}
                                        {group.unreadCount > 0 && (
                                            <span className="h-2.5 w-2.5 bg-teal-500 rounded-full shadow-[0_0_8px_#14b8a6]" />
                                        )}

                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/10 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-white/10 text-white">
                                                    <DropdownMenuItem className="focus:bg-slate-800 focus:text-white" onClick={(e) => togglePin(group.id, group.is_pinned || false, e)}>
                                                        {group.is_pinned ? (
                                                            <><PinOff className="h-4 w-4 mr-2" /> Unpin</>
                                                        ) : (
                                                            <><Pin className="h-4 w-4 mr-2" /> Pin</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="focus:bg-slate-800 focus:text-white" onClick={(e) => toggleArchive(group.id, group.is_archived || false, e)}>
                                                        {group.is_archived ? (
                                                            <><ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive</>
                                                        ) : (
                                                            <><Archive className="h-4 w-4 mr-2" /> Archive</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={(e) => deleteGroup(group.id, e)}
                                                        className="text-red-400 focus:text-red-400 focus:bg-slate-800"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Chat
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div >
                            ))}
                        </div >
                    )}

                    {/* Archived Chats Button */}
                    {
                        !showArchived && !searchQuery && groups.some(g => g.is_archived) && (
                            <div className="p-4 border-t border-white/10 mt-auto">
                                <Button
                                    variant="ghost"
                                    className="w-full flex items-center justify-between text-slate-400 hover:text-white hover:bg-white/5"
                                    onClick={() => setShowArchived(true)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Archive className="h-4 w-4" />
                                        <span>Archived</span>
                                    </div>
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{groups.filter(g => g.is_archived).length}</span>
                                </Button>
                            </div>
                        )
                    }
                </main >
            )}

            {/* Call History */}
            {
                activeTab === "calls" && (
                    <main className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                        {/* Start Call Button */}
                        <div className="mb-6">
                            <Button
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white"
                                size="lg"
                                onClick={() => setContactSelectorOpen(true)}
                            >
                                <Video className="mr-2 h-5 w-5" />
                                Start Video Call
                            </Button>
                        </div>

                        {/* Call History List */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">Recent Calls</h3>
                            {callHistory.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No call history yet</p>
                                    <p className="text-sm mt-2">Start your first video call!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {callHistory.map((call) => (
                                        <div
                                            key={call.id}
                                            className="p-4 border border-white/5 rounded-lg hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-teal-500/10 rounded-full">
                                                        <Video className="h-5 w-5 text-teal-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">
                                                            {call.participants.length} participant{call.participants.length !== 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-sm text-slate-400">
                                                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={call.status === "active" ? "default" : "secondary"} className={call.status === "active" ? "bg-teal-500" : "bg-slate-700"}>
                                                    {call.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                )
            }

            <Footer isCompact className="mt-auto border-t border-white/5 bg-slate-950/80 backdrop-blur-md pb-0 px-2" />
        </aside >
    );

    // Desktop: Two-pane layout
    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Chat List Sidebar */}
            {chatListSidebar}

            {/* Right Panel: Active Conversation or Empty State */}
            <div className="hidden lg:flex h-screen flex-1 flex-col bg-slate-950 border-l border-white/10">
                {groupId ? (
                    <ChatConversation
                        groupId={groupId}
                        isMobile={false}
                        initialGroupData={(() => {
                            const selectedGroup = groups.find(g => g.id === groupId);
                            return selectedGroup ? {
                                name: selectedGroup.name,
                                avatar_url: selectedGroup.avatar_url
                            } : undefined;
                        })()}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <MessageSquare className="h-20 w-20 mx-auto mb-4 text-slate-800" />
                        <h3 className="text-xl font-semibold mb-2 text-slate-400">Select a chat to start messaging</h3>
                        <p className="text-slate-600">Choose a conversation from the list on the left</p>
                    </div>
                )}
            </div>

            {/* Contact Selector Dialog */}
            <ContactSelectorDialog
                open={contactSelectorOpen}
                onOpenChange={setContactSelectorOpen}
                onStartCall={handleStartCall}
            />

            {/* Video Call Room */}
            <VideoCallRoom
                open={!!activeCallId}
                onOpenChange={(open) => !open && setActiveCallId(null)}
                callId={activeCallId}
                participants={activeCallParticipants}
            />

            {/* Create Group Dialog */}
            <CreateGroupDialog
                open={createGroupOpen}
                onOpenChange={setCreateGroupOpen}
                onGroupCreated={loadGroups}
            />

            {/* User Search Dialog */}
            <UserSearchDialog
                open={userSearchOpen}
                onOpenChange={setUserSearchOpen}
            />

            {/* Simple Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setGroupToDelete(null);
                    }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80" />

                    {/* Modal */}
                    <div
                        className="relative bg-background border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-2">Delete Chat</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete this chat? This action cannot be undone and you will lose access to all messages in this chat.
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setGroupToDelete(null);
                                }}
                                className="focus:ring-0 focus:outline-none"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white focus:ring-0 focus:outline-none"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
