import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { LogOut, Users, MessageSquare, Clock, User } from "lucide-react";
import { toast } from "sonner";
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

  useEffect(() => {
    loadProfile();
    loadRoomsAndGroups();
  }, []);

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

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <RecordingsCalendar
              selectedDate={selectedRecordingDate}
              onDateSelect={setSelectedRecordingDate}
            />
            <Avatar>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="font-medium">{profile?.username}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
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

          {/* Room theme + mood controls */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Room Appearance & Status</CardTitle>
              <CardDescription>Customize the vibe and look</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <RoomThemeSelector value={theme} onChange={setTheme} compact />
                <RoomStatusMood value={mood} onChange={setMood} compact />
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="hover:shadow-[var(--shadow-smooth)] transition-shadow cursor-pointer">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Create a Room</CardTitle>
                <CardDescription>
                  Start a short-lived interactive session for real-time collaboration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateRoomDialog />
              </CardContent>
            </Card>

            <Card className="hover:shadow-[var(--shadow-smooth)] transition-shadow cursor-pointer">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-secondary mb-2" />
                <CardTitle>Create a Group</CardTitle>
                <CardDescription>
                  Set up a long-term chat hub for your team or classmates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateGroupDialog />
              </CardContent>
            </Card>
          </div>

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
