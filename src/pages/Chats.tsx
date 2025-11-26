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
import { ArrowLeft, Search, MoreVertical, Pin, Archive, PinOff, ArchiveRestore } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

export default function Chats() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<GroupWithLastMessage[]>([]);
    const [filteredGroups, setFilteredGroups] = useState<GroupWithLastMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadGroups();
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-card border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold">Chats</h1>
                    </div>

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
                    <div className="divide-y">
                        {(showArchived ? filteredGroups.filter(g => g.is_archived) : filteredGroups.filter(g => !g.is_archived)).map((group) => (
                            <div
                                key={group.id}
                                className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer group relative"
                                onClick={() => navigate(`/group/${group.id}`)}
                            >
                                {/* Group Avatar */}
                                <Avatar className="h-14 w-14 flex-shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                                        {group.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Group Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <h3 className="font-semibold text-base truncate">{group.name}</h3>
                                            {group.is_pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0 rotate-45" fill="currentColor" />}
                                        </div>
                                        {group.lastMessage && (
                                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                {formatDistanceToNow(new Date(group.lastMessage.created_at), { addSuffix: false })}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground truncate">
                                            {group.lastMessage ? (
                                                <span>
                                                    <span className="font-medium">{group.lastMessage.sender_name}:</span>{" "}
                                                    {group.lastMessage.content}
                                                </span>
                                            ) : (
                                                group.description || "No messages yet"
                                            )}
                                        </p>

                                        {/* Unread Badge */}
                                        {group.unreadCount > 0 && (
                                            <Badge className="ml-2 flex-shrink-0 bg-green-500 hover:bg-green-600 text-white rounded-full h-5 min-w-[20px] px-1.5">
                                                {group.unreadCount}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Action Menu */}
                                <div className="absolute right-2 top-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => togglePin(group.id, group.is_pinned || false, e)}>
                                                {group.is_pinned ? (
                                                    <>
                                                        <PinOff className="mr-2 h-4 w-4" /> Unpin Chat
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin className="mr-2 h-4 w-4" /> Pin Chat
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => toggleArchive(group.id, group.is_archived || false, e)}>
                                                {group.is_archived ? (
                                                    <>
                                                        <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                                                    </>
                                                ) : (
                                                    <>
                                                        <Archive className="mr-2 h-4 w-4" /> Archive
                                                    </>
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
        </div>
    );
}
