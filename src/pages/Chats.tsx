import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Search, MoreVertical, Pin, Archive, PinOff, ArchiveRestore, Plus, Video, Phone, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ContactSelectorDialog } from "@/components/ContactSelectorDialog";
import { VideoCallRoom } from "@/components/VideoCallRoom";

interface Group {
    id: string;
    name: string;
    description: string | null;
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
    const [groups, setGroups] = useState<GroupWithLastMessage[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<GroupWithLastMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
    const [videoCallOpen, setVideoCallOpen] = useState(false);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const [currentCallParticipants, setCurrentCallParticipants] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<"chats" | "calls">("chats");
    const [callHistory, setCallHistory] = useState<VideoCall[]>([]);

    useEffect(() => {
        loadGroups();
        loadCallHistory();
    }, []);

    const loadGroups = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }

            // Load groups where user is a member, including pinned/archived status
            const { data: memberData } = await supabase
                .from("group_members")
                .select("group_id, is_pinned, is_archived")
                .eq("user_id", user.id);

            if (!memberData || memberData.length === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }

            const groupIds = memberData.map(m => m.group_id);
            const memberMap = new Map(memberData.map(m => [m.group_id, m]));

            // Load group details
            const { data: groupsData } = await supabase
                .from("groups")
                .select("*")
                .in("id", groupIds)
                .order("created_at", { ascending: false });

            if (!groupsData) {
                setGroups([]);
                setLoading(false);
                return;
            }

            // Load last message and unread count for each group
            const groupsWithMessages = await Promise.all(
                groupsData.map(async (group) => {
                    // Get last message
                    const { data: lastMsg } = await supabase
                        .from("group_messages")
                        .select("content, created_at, sender:profiles(username)")
                        .eq("group_id", group.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    // Get unread count: messages user hasn't sent and hasn't read
                    const { data: groupMsgs } = await supabase
                        .from("group_messages")
                        .select("id")
                        .eq("group_id", group.id)
                        .neq("sender_id", user.id);

                    let unreadCount = 0;
                    if (groupMsgs && groupMsgs.length > 0) {
                        const messageIds = groupMsgs.map(m => m.id);
                        const { data: readReceipts } = await (supabase as any)
                            .from("message_read_receipts")
                            .select("message_id")
                            .in("message_id", messageIds)
                            .eq("user_id", user.id);

                        const readMessageIds = new Set((readReceipts || []).map((r: any) => r.message_id));
                        unreadCount = groupMsgs.filter(m => !readMessageIds.has(m.id)).length;
                    }

                    const memberInfo = memberMap.get(group.id);

                    return {
                        ...group,
                        is_pinned: memberInfo?.is_pinned || false,
                        is_archived: memberInfo?.is_archived || false,
                        lastMessage: lastMsg ? {
                            content: lastMsg.content,
                            created_at: lastMsg.created_at,
                            sender_name: (lastMsg.sender as any)?.username || "Unknown"
                        } : undefined,
                        unreadCount: Math.min(unreadCount, 99)
                    };
                })
            );

            // Sort: Pinned first, then by date
            const sortedGroups = groupsWithMessages.sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                // If both pinned or both not pinned, sort by last message or creation date
                const dateA = new Date(a.lastMessage?.created_at || a.created_at).getTime();
                const dateB = new Date(b.lastMessage?.created_at || b.created_at).getTime();
                return dateB - dateA;
            });

            setGroups(sortedGroups);
            setFilteredGroups(sortedGroups);
        } catch (error) {
            console.error("Failed to load groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartCall = async (selectedContactIds: string[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create video call
            const { data: call, error: callError } = await supabase
                .from("video_calls")
                .insert({ creator_id: user.id, status: "active" })
                .select()
                .single();

            if (callError) throw callError;

            // Add participants
            const participants = [user.id, ...selectedContactIds];
            const participantsData = participants.map(id => ({
                call_id: call.id,
                user_id: id,
            }));

            const { error: participantError } = await supabase
                .from("call_participants")
                .insert(participantsData);

            if (participantError) throw participantError;

            // Open video call room
            setCurrentCallId(call.id);
            setCurrentCallParticipants(participants);
            setVideoCallOpen(true);

            toast.success("Video call started!");
        } catch (error: any) {
            toast.error("Failed to start call: " + (error.message || "Unknown error"));
            console.error(error);
        }
    };

    const loadCallHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: calls } = await (supabase as any)
                .from("video_calls")
                .select("id, creator_id, status, created_at")
                .or(`creator_id.eq.${user.id}`)
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
                .update({ is_pinned: !currentStatus })
                .eq("group_id", groupId)
                .eq("user_id", user.id);

            if (error) throw error;

            setGroups(groups.map(g =>
                g.id === groupId ? { ...g, is_pinned: !currentStatus } : g
            ).sort((a, b) => {
                // Re-sort locally
                const aPinned = a.id === groupId ? !currentStatus : a.is_pinned;
                const bPinned = b.id === groupId ? !currentStatus : b.is_pinned;
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                const dateA = new Date(a.lastMessage?.created_at || a.created_at).getTime();
                const dateB = new Date(b.lastMessage?.created_at || b.created_at).getTime();
                return dateB - dateA;
            }));

            toast.success(currentStatus ? "Chat unpinned" : "Chat pinned");
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
                .update({ is_archived: !currentStatus })
                .eq("group_id", groupId)
                .eq("user_id", user.id);

            if (error) throw error;

            // Update local state
            const updatedGroups = groups.map(g =>
                g.id === groupId ? { ...g, is_archived: !currentStatus } : g
            );
            setGroups(updatedGroups);

            toast.success(currentStatus ? "Chat unarchived" : "Chat archived");
        } catch (error) {
            toast.error("Failed to update archive status");
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Sidebar - Desktop only */}
            <aside className="hidden lg:flex flex-col w-20 border-r bg-card">
                {/* Chats Tab */}
                <button
                    className={`flex flex-col items-center justify-center py-6 gap-2 transition-colors relative ${activeTab === "chats" ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                    onClick={() => setActiveTab("chats")}
                >
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-xs">Chats</span>
                    {filteredGroups.filter(g => !g.is_archived).reduce((sum, g) => sum + g.unreadCount, 0) > 0 && (
                        <Badge className="absolute top-2 right-2 h-5 min-w-[20px] px-1 bg-red-500 text-white text-xs">
                            {Math.min(99, filteredGroups.filter(g => !g.is_archived).reduce((sum, g) => sum + g.unreadCount, 0))}
                        </Badge>
                    )}
                </button>

                {/* Calls Tab */}
                <button
                    className={`flex flex-col items-center justify-center py-6 gap-2 transition-colors ${activeTab === "calls" ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                    onClick={() => setActiveTab("calls")}
                >
                    <Phone className="h-6 w-6" />
                    <span className="text-xs">Calls</span>
                </button>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-card border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <h1 className="text-2xl font-bold">Chats</h1>
                            </div>

                            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => {
                                        setDropdownOpen(false);
                                        setTimeout(() => setCreateGroupOpen(true), 100);
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" /> New Group
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        setDropdownOpen(false);
                                        setShowArchived(true);
                                    }}>
                                        <Archive className="mr-2 h-4 w-4" /> Archived Chats
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="container mx-auto px-4 pb-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </header>

                {/* Chat List */}
                {activeTab === "chats" && (
                    <main className="container mx-auto px-0">
                        {showArchived && (
                            <div className="bg-muted/30 p-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => setShowArchived(false)}>
                                <ArrowLeft className="h-4 w-4" />
                                Back to Chats
                            </div>
                        )}

                        {groups.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No chats yet. Create or join a group to start chatting!</p>
                            </div>
                        ) : (showArchived ? filteredGroups.filter(g => g.is_archived) : filteredGroups.filter(g => !g.is_archived)).length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>{showArchived ? "No archived chats" : `No chats found matching "${searchQuery}"`}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {(showArchived ? filteredGroups.filter(g => g.is_archived) : filteredGroups.filter(g => !g.is_archived)).map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex items-center gap-4 p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors relative"
                                        onClick={() => navigate(`/group/${group.id}`)}
                                    >
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${group.id}`} />
                                            <AvatarFallback>{group.name[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold truncate">{group.name}</h3>
                                                {group.is_pinned && <Pin className="h-3 w-3 text-primary fill-current" />}
                                                {group.is_archived && <Archive className="h-3 w-3 text-muted-foreground" />}
                                            </div>
                                            {group.lastMessage && (
                                                <p className="text-sm text-muted-foreground truncate">
                                                    <span className="font-medium">{group.lastMessage.sender_name}:</span> {group.lastMessage.content}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            {group.lastMessage && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(group.lastMessage.created_at), { addSuffix: true })}
                                                </span>
                                            )}
                                            {group.unreadCount > 0 && (
                                                <Badge className="bg-primary text-primary-foreground">
                                                    {group.unreadCount > 99 ? '99+' : group.unreadCount}
                                                </Badge>
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => togglePin(group.id, group.is_pinned || false, e)}>
                                                        {group.is_pinned ? (
                                                            <><PinOff className="mr-2 h-4 w-4" /> Unpin</>
                                                        ) : (
                                                            <><Pin className="mr-2 h-4 w-4" /> Pin</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => toggleArchive(group.id, group.is_archived || false, e)}>
                                                        {group.is_archived ? (
                                                            <><ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive</>
                                                        ) : (
                                                            <><Archive className="mr-2 h-4 w-4" /> Archive</>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Archived Chats Button */}
                        {!showArchived && !searchQuery && groups.some(g => g.is_archived) && (
                            <div className="p-4 border-t mt-auto">
                                <Button
                                    variant="ghost"
                                    className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowArchived(true)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Archive className="h-4 w-4" />
                                        <span>Archived</span>
                                    </div>
                                    <span className="text-xs">{groups.filter(g => g.is_archived).length}</span>
                                </Button>
                            </div>
                        )}
                    </main>
                )}

                {/* Call History */}
                {activeTab === "calls" && (
                    <main className="container mx-auto px-4 py-6">
                        {/* Start Call Button */}
                        <div className="mb-6">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => setContactSelectorOpen(true)}
                            >
                                <Video className="mr-2 h-5 w-5" />
                                Start Video Call
                            </Button>
                        </div>

                        {/* Call History List */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Recent Calls</h3>
                            {callHistory.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No call history yet</p>
                                    <p className="text-sm mt-2">Start your first video call!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {callHistory.map((call) => (
                                        <div
                                            key={call.id}
                                            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <Video className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            {call.participants.length} participant{call.participants.length !== 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={call.status === "active" ? "default" : "secondary"}>
                                                    {call.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                )}

                {/* Contact Selector Dialog */}
                <ContactSelectorDialog
                    open={contactSelectorOpen}
                    onOpenChange={setContactSelectorOpen}
                    onStartCall={handleStartCall}
                />

                {/* Video Call Room */}
                <VideoCallRoom
                    open={videoCallOpen}
                    onOpenChange={setVideoCallOpen}
                    callId={currentCallId}
                    participants={currentCallParticipants}
                />

                {/* Create Group Dialog */}
                <CreateGroupDialog
                    open={createGroupOpen}
                    onOpenChange={setCreateGroupOpen}
                    onGroupCreated={loadGroups}
                />
            </div>
        </div>
        </div>
    );
}
