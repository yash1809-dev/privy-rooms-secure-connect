import { Button } from "@/components/ui/button";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { UserPlus, UserCheck, Clock, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FriendRequestButtonProps {
    targetUserId: string;
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "outline" | "ghost";
    showLabel?: boolean;
}

export function FriendRequestButton({
    targetUserId,
    size = "sm",
    variant = "default",
    showLabel = true,
}: FriendRequestButtonProps) {
    const { sendRequest, cancelRequest, getConnectionStatus } = useFriendRequests();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, []);

    if (!currentUserId || currentUserId === targetUserId) {
        return null;
    }

    const connection = getConnectionStatus(targetUserId, currentUserId);

    // If already connected (accepted)
    if (connection.status === 'accepted') {
        return (
            <Button size={size} variant="outline" disabled className="gap-2">
                <UserCheck className="h-4 w-4" />
                {showLabel && <span className="hidden sm:inline">Connected</span>}
            </Button>
        );
    }

    // If request was denied
    if (connection.status === 'denied' && connection.type === 'sent') {
        return (
            <Button size={size} variant="outline" disabled className="gap-2">
                <UserX className="h-4 w-4" />
                {showLabel && <span className="hidden sm:inline">Request Declined</span>}
            </Button>
        );
    }

    // If pending request sent by current user
    if (connection.type === 'sent' && connection.status === 'pending') {
        return (
            <Button
                size={size}
                variant="outline"
                onClick={() => connection.requestId && cancelRequest.mutate(connection.requestId)}
                className="gap-2"
            >
                <Clock className="h-4 w-4" />
                {showLabel && <span className="hidden sm:inline">Request Sent</span>}
            </Button>
        );
    }

    // If pending request received (show in notification instead, so hide button)
    if (connection.type === 'received' && connection.status === 'pending') {
        return (
            <Button size={size} variant="outline" disabled className="gap-2">
                <Clock className="h-4 w-4" />
                {showLabel && <span className="hidden sm:inline">Pending</span>}
            </Button>
        );
    }

    // Default: No connection, show "Add Friend" button
    return (
        <Button
            size={size}
            variant={variant}
            onClick={() => sendRequest.mutate(targetUserId)}
            className="gap-2 shrink-0 bg-teal-600 hover:bg-teal-500 text-white border-none"
            disabled={sendRequest.isPending}
        >
            <UserPlus className="h-4 w-4" />
            {showLabel && <span className="hidden sm:inline">Add Friend</span>}
        </Button>
    );
}
