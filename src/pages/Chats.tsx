import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Group {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
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

            // Load groups where user is a member
            const { data: memberData } = await supabase
                .from("group_members")
                .select("group_id")
                .eq("user_id", user.id);

            if (!memberData || memberData.length === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }

            const groupIds = memberData.map(m => m.group_id);

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

                    // Get unread count (simplified - just count all messages for now)
                    const { count } = await supabase
                        .from("group_messages")
                        .select("*", { count: "exact", head: true })
                        .eq("group_id", group.id);

                    return {
                        ...group,
                        lastMessage: lastMsg ? {
                            content: lastMsg.content,
                            created_at: lastMsg.created_at,
                            sender_name: (lastMsg.sender as any)?.username || "Unknown"
                        } : undefined,
                        unreadCount: Math.min(count || 0, 99) // Cap at 99 like WhatsApp
                    };
                })
            );

            setGroups(groupsWithMessages);
            setFilteredGroups(groupsWithMessages);
        } catch (error) {
            console.error("Failed to load groups:", error);
        } finally {
            setLoading(false);
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
                {groups.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No chats yet. Create or join a group to start chatting!</p>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No chats found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredGroups.map((group) => (
                            <div
                                key={group.id}
                                className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
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
                                        <h3 className="font-semibold text-base truncate">{group.name}</h3>
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
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
