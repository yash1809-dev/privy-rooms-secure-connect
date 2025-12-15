import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { RecordingsCalendar } from "@/components/RecordingsCalendar";
import { useTheme } from "@/components/ThemeProvider";
import { LogOut, User, MoreVertical, Sun, Moon, Send } from "lucide-react";
import { toast } from "sonner";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useMobile } from "@/hooks/useMediaQuery";

export function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedRecordingDate, setSelectedRecordingDate] = useState<Date | undefined>(undefined);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const { setTheme: setAppTheme } = useTheme();
    const isMobile = useMobile();

    useEffect(() => {
        loadTotalUnreadCount();

        // Subscribe to new messages for real-time unread count updates
        const channel = supabase
            .channel('unread-messages')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'group_messages'
            }, () => {
                loadTotalUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadTotalUnreadCount = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get all groups where user is a member
            const { data: memberGroups } = await supabase
                .from("group_members")
                .select("group_id")
                .eq("user_id", user.id);

            if (!memberGroups || memberGroups.length === 0) {
                setTotalUnreadCount(0);
                return;
            }

            const groupIds = memberGroups.map(m => m.group_id);

            // Get all messages in these groups that are NOT sent by the current user
            const { data: groupMessages } = await supabase
                .from("group_messages")
                .select("id")
                .in("group_id", groupIds)
                .neq("sender_id", user.id);

            if (!groupMessages || groupMessages.length === 0) {
                setTotalUnreadCount(0);
                return;
            }

            const messageIds = groupMessages.map(m => m.id);

            // Get all messages the user has read
            const { data: readReceipts } = await (supabase as any)
                .from("message_read_receipts")
                .select("message_id")
                .in("message_id", messageIds)
                .eq("user_id", user.id);

            const readMessageIds = new Set((readReceipts || []).map((r: any) => r.message_id));

            // Count unread messages
            const unreadCount = groupMessages.filter(m => !readMessageIds.has(m.id)).length;
            setTotalUnreadCount(Math.min(unreadCount, 99));
        } catch (error) {
            console.error("Failed to load unread count:", error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    // Show header only on dashboard page
    const hideHeader = location.pathname !== '/dashboard';

    return (
        <div className="min-h-screen flex flex-col bg-[var(--gradient-subtle)]">
            {!hideHeader && (
                <header className="border-b bg-card">
                    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate('/dashboard')}
                        >
                            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 p-1.5 shadow-md">
                                <img
                                    src="/favicon.png"
                                    alt="CollegeOS"
                                    className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                                />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-primary">
                                CollegeOS
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Instagram-style Message Icon with Badge - hidden on mobile (shown in bottom nav) */}
                            {!isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative rounded-full"
                                    onClick={() => navigate("/chats")}
                                >
                                    <Send className="h-5 w-5" />
                                    {totalUnreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full" />
                                    )}
                                </Button>
                            )}

                            {/* 3-Dot Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                                        <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                            <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                            <span>Appearance</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => setAppTheme("light")}>
                                                Light
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setAppTheme("dark")}>
                                                Dark
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setAppTheme("system")}>
                                                System
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header >
            )
            }

            <main className="flex-1 pb-0 lg:pb-0">
                <Outlet context={{ selectedRecordingDate }} />
            </main>

            {!hideHeader && <Footer className={isMobile ? "pb-24" : ""} />}

            {/* Mobile Bottom Navigation */}
            {
                !hideHeader && isMobile && (
                    <MobileBottomNav unreadCount={totalUnreadCount} />
                )
            }
        </div >
    );
}
