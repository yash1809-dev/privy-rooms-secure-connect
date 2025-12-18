import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FriendRequestButton } from "./FriendRequestButton";
import { useEffect } from "react";
import { useFriendRequests } from "@/hooks/useFriendRequests";

interface User {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
}

interface UserSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserSearchDialog({ open, onOpenChange }: UserSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const { requests } = useFriendRequests();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setUsers([]);
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, email, avatar_url')
                    .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                    .limit(20);

                if (error) throw error;

                // Filter out current user
                const filteredUsers = (data || []).filter((u: User) => u.id !== currentUserId);
                setUsers(filteredUsers);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, currentUserId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-slate-900/95 border-white/10 text-white backdrop-blur-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Find Friends</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by username or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-teal-500/50 focus:ring-teal-500/20"
                            autoFocus
                        />
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                {searchQuery.trim().length < 2 ? (
                                    <p className="text-sm">Type at least 2 characters to search</p>
                                ) : (
                                    <p className="text-sm">No users found</p>
                                )}
                            </div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                                >
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-white/10">
                                        <AvatarImage src={user.avatar_url || undefined} />
                                        <AvatarFallback className="bg-slate-800 text-teal-400">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate text-white">{user.username}</p>
                                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                    </div>

                                    <div className="shrink-0">
                                        <FriendRequestButton targetUserId={user.id} size="sm" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
