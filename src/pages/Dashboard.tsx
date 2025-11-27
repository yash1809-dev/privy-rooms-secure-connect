import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/Footer";
import { useTheme } from "@/components/ThemeProvider";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { LogOut, Users, MessageSquare, Clock, User, MoreVertical, Calendar, Sun, Moon, Send } from "lucide-react";
import { toast } from "sonner";
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
import VoiceNotesToText from "@/components/VoiceNotesToText";
import Timetable from "@/components/Timetable";
import RoomThemeSelector, { RoomThemeBadge, ThemeKey } from "@/components/RoomThemeSelector";
import RoomStatusMood, { RoomMoodBadge, MoodKey } from "@/components/RoomStatusMood";
import { RecordingsCalendar } from "@/components/RecordingsCalendar";

interface Profile {
  username: string;
  email: string;
  avatar_url: string | null;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  is_password_protected: boolean;
  created_at: string;
  expires_at: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_password_protected: boolean;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeKey>("default");
  const [mood, setMood] = useState<MoodKey>("studying");
  const [selectedRecordingDate, setSelectedRecordingDate] = useState<Date | undefined>(undefined);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { setTheme: setAppTheme } = useTheme();

  useEffect(() => {
    loadProfile();
    loadRoomsAndGroups();
    loadTotalUnreadCount();
  }, []);;

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Failed to load profile");
    }
  };

  const loadRoomsAndGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);
    } catch (error: any) {
      toast.error("Failed to load spaces");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gradient-subtle)]">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">PrivyRooms</h1>

          <div className="flex items-center gap-3">
            {/* Calendar Icon */}
            <RecordingsCalendar
              selectedDate={selectedRecordingDate}
              onDateSelect={setSelectedRecordingDate}
            />

            {/* Instagram-style Message Icon with Badge */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={() => navigate("/chats")}
            >
              <Send className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </Badge>
              )}
            </Button>

            {/* 3-Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                  <MoreVertical className="h-5 w-5" />
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
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Your Workspace</h2>

          {/* Timetable */}
          <Timetable />

          {/* Voice Notes to Text */}
          <VoiceNotesToText selectedDate={selectedRecordingDate} />

          {/* Rooms Section */}
          {rooms.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Rooms
                </CardTitle>
                <CardDescription>
                  Interactive short-lived spaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{room.name}</h4>
                          {room.is_password_protected && (
                            <Badge variant="secondary" className="text-xs">
                              Protected
                            </Badge>
                          )}
                          <RoomThemeBadge theme={theme} />
                          <RoomMoodBadge mood={mood} />
                        </div>
                        {room.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {room.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires: {new Date(room.expires_at!).toLocaleString()}
                        </div>
                      </div>
                      <ShareLinkButton id={room.id} type="room" name={room.name} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Groups Section */}
          {groups.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Your Groups
                </CardTitle>
                <CardDescription>
                  Long-term collaboration spaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/group/${group.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{group.name}</h4>
                          {group.is_password_protected && (
                            <Badge variant="secondary" className="text-xs">
                              Protected
                            </Badge>
                          )}
                          <RoomThemeBadge theme={theme} />
                          <RoomMoodBadge mood={mood} />
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <ShareLinkButton id={group.id} type="group" name={group.name} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {rooms.length === 0 && groups.length === 0 && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Your Spaces</CardTitle>
                <CardDescription>
                  Rooms and groups you've created
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p>No spaces yet. Create your first Room or Group above!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
