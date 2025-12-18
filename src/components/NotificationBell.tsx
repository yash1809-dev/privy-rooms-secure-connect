import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/useNotifications";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useGroupInvites } from "@/hooks/useGroupInvites";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface NotificationBellProps {
    onJoinCall?: (callId: string) => void;
}

export function NotificationBell({ onJoinCall }: NotificationBellProps = {}) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { acceptRequest, denyRequest } = useFriendRequests();
    const { acceptInvite, declineInvite } = useGroupInvites();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    const handleAcceptFriend = async (requestId: string, notificationId: string) => {
        await acceptRequest.mutateAsync(requestId);
        markAsRead.mutate(notificationId);
    };

    const handleDenyFriend = async (requestId: string, notificationId: string) => {
        await denyRequest.mutateAsync(requestId);
        markAsRead.mutate(notificationId);
    };

    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

    const handleFollowBack = async (userId: string, notificationId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if already following
            const { data: existing } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', userId)
                .single();

            if (existing) {
                toast.info("Already following");
                setFollowedUsers(prev => new Set(prev).add(userId));
                markAsRead.mutate(notificationId);
                return;
            }

            // Optimistic update
            setFollowedUsers(prev => new Set(prev).add(userId));

            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: user.id, following_id: userId });

            if (error) throw error;

            toast.success("Now following!");
            markAsRead.mutate(notificationId);
        } catch (error: any) {
            toast.error("Failed to follow");
            // Remove from optimistic update on error
            setFollowedUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const handleAcceptGroupInvite = async (inviteId: string, notificationId: string) => {
        await acceptInvite.mutateAsync(inviteId);
        markAsRead.mutate(notificationId);
    };

    const handleDeclineGroupInvite = async (inviteId: string, notificationId: string) => {
        await declineInvite.mutateAsync(inviteId);
        markAsRead.mutate(notificationId);
    };

    const handleJoinCall = async (callId: string, notificationId: string) => {
        try {
            if (onJoinCall) {
                // Use parent's handler if provided (shares state with Chats component)
                onJoinCall(callId);
            }
            markAsRead.mutate(notificationId);
            toast.success("Joining call...");
        } catch (error) {
            console.error('Failed to join call:', error);
        }
    };

    const handleDeclineCall = async (callId: string, notificationId: string) => {
        // Just mark as read - user declined
        markAsRead.mutate(notificationId);
        toast.info("Call declined");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsRead.mutate()}
                            className="text-xs h-7"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={`flex flex-col items-start gap-2 p-3 cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                                }`}
                            onClick={() => markAsRead.mutate(notification.id)}
                        >
                            <div className="flex items-start gap-3 w-full">
                                {(notification.data?.sender_username || notification.data?.inviter_username) && (
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                        <AvatarImage src={notification.data?.avatar_url || undefined} />
                                        <AvatarFallback>
                                            {(notification.data.sender_username || notification.data.inviter_username)?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>

                            {/* Friend Request Actions - Only show if request is pending */}
                            {notification.type === 'friend_request' && notification.data?.request_id && !notification.read && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptFriend(notification.data.request_id, notification.id);
                                        }}
                                        className="flex-1 h-8"
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDenyFriend(notification.data.request_id, notification.id);
                                        }}
                                        className="flex-1 h-8"
                                    >
                                        Deny
                                    </Button>
                                </div>
                            )}

                            {/* Follow Back Button (after accepting friend request) */}
                            {notification.type === 'friend_accepted' && notification.data?.user_id && !notification.read && !followedUsers.has(notification.data.user_id) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollowBack(notification.data.user_id, notification.id);
                                    }}
                                    className="w-full h-8 mt-1"
                                >
                                    Follow Back
                                </Button>
                            )}

                            {/* Group Invite Actions */}
                            {notification.type === 'group_invite' && notification.data?.invite_id && !notification.read && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptGroupInvite(notification.data.invite_id, notification.id);
                                        }}
                                        className="flex-1 h-8"
                                    >
                                        Join Group
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeclineGroupInvite(notification.data.invite_id, notification.id);
                                        }}
                                        className="flex-1 h-8"
                                    >
                                        Decline
                                    </Button>
                                </div>
                            )}

                            {/* Video Call Actions */}
                            {notification.type === 'video_call' && notification.data?.call_id && !notification.read && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinCall(notification.data.call_id, notification.id);
                                        }}
                                        className="flex-1 h-8 bg-green-600 hover:bg-green-700"
                                    >
                                        Join Call
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeclineCall(notification.data.call_id, notification.id);
                                        }}
                                        className="flex-1 h-8"
                                    >
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
