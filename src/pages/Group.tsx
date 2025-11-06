import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import MiniDashboard from "@/components/MiniDashboard";
import RoomRecap from "@/components/RoomRecap";
import SmartPolls from "@/components/SmartPolls";
import VoiceNotesToText from "@/components/VoiceNotesToText";
import { MessageSquare, BarChart3 } from "lucide-react";

interface ProfileRow { id: string; username: string; email: string; avatar_url: string | null }

export default function Group() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [me, setMe] = useState<ProfileRow | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`group_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` }, () => {
        loadMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");
      const meRes = await supabase.from("profiles").select("id, username, email, avatar_url").eq("id", user.id).single();
      setMe(meRes.data as any);

      const g = await supabase.from("groups").select("*").eq("id", id).single();
      setGroup(g.data);
      await Promise.all([loadMessages(), loadMembers(), loadFollowLists()]);
    } catch (e) {
      toast.error("Failed to load group");
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("group_messages")
      .select("*, sender:profiles(id,username,avatar_url)")
      .eq("group_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error loading messages:", error);
      return;
    }
    setMessages(data || []);
  };

  const loadMembers = async () => {
    const { data } = await supabase.from("group_members").select("user:profiles(id,username,email,avatar_url)").eq("group_id", id);
    setMembers((data || []).map((r: any) => r.user));
  };

  const loadFollowLists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [followerJoins, followingJoins] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);
    const followerIds = (followerJoins.data || []).map((j: any) => j.follower_id);
    const followingIds = (followingJoins.data || []).map((j: any) => j.following_id);
    const [followersRes, followingRes] = await Promise.all([
      followerIds.length ? supabase.from("profiles").select("id,username,email,avatar_url").in("id", followerIds) : Promise.resolve({ data: [] }),
      followingIds.length ? supabase.from("profiles").select("id,username,email,avatar_url").in("id", followingIds) : Promise.resolve({ data: [] }),
    ]);
    setFollowers((followersRes as any).data || []);
    setFollowing((followingRes as any).data || []);
  };

  const send = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !text.trim() || !id) return;
      const { error } = await supabase.from("group_messages").insert({ group_id: id, sender_id: user.id, content: text.trim() });
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send: " + error.message);
        return;
      }
      setText("");
      // Reload messages immediately
      await loadMessages();
    } catch (e: any) {
      console.error("Send error:", e);
      toast.error("Failed to send: " + (e.message || "Unknown error"));
    }
  };

  const createPoll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
        toast.error("Please provide a question and at least 2 options");
        return;
      }
      const { error } = await supabase.from("group_polls").insert({
        group_id: id,
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()),
        created_by: user.id,
      });
      if (error) {
        // If the table wasn't created yet, guide the user
        const msg = (error as any)?.message || "Unknown error";
        if (msg.includes("group_polls") || msg.includes("schema cache") || (error as any)?.code === '42P01') {
          toast.error("Polls not initialized. Please run Supabase migrations.", {
            description: "Run: supabase db push (see README)"
          });
        } else {
          toast.error("Failed to create poll: " + msg);
        }
        return;
      }
      setPollDialogOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      toast.success("Poll created!");
    } catch (e: any) {
      const msg = e?.message || "Unknown error";
      if (msg.includes("group_polls") || msg.includes("schema cache")) {
        toast.error("Polls not initialized. Please run Supabase migrations.", {
          description: "Run: supabase db push (see README)"
        });
      } else {
        toast.error("Failed to create poll: " + msg);
      }
    }
  };

  const addMember = async (userId: string) => {
    try {
      await supabase.from("group_members").insert({ group_id: id, user_id: userId, role: "member" });
      await loadMembers();
    } catch {
      toast.error("Unable to add member");
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await supabase.from("group_members").delete().match({ group_id: id, user_id: userId });
      await loadMembers();
    } catch {
      toast.error("Unable to remove member");
    }
  };

  const saveSettings = async (updates: { name?: string; description?: string; avatar_url?: string | null }) => {
    try {
      await supabase.from("groups").update(updates).eq("id", id);
      await load();
      toast.success("Group updated");
    } catch {
      toast.error("Failed to update group");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>{group?.name || "Group"}</CardTitle>
            <CardDescription>{group?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chat">
              <TabsList>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <MiniDashboard groupId={id} />
                <RoomRecap groupId={id} />
                <SmartPolls groupId={id} />
                <VoiceNotesToText groupId={id} />
                <div className="h-[50vh] border rounded p-3 overflow-y-auto bg-background mb-2">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</div>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 mb-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={m.sender?.avatar_url || undefined} />
                        <AvatarFallback>{m.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{m.sender?.username || "Unknown"}</div>
                        <div className="text-sm break-words">{m.content}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Type a message" 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className="flex-1"
                  />
                  <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Create Poll">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Poll</DialogTitle>
                        <DialogDescription>Create a poll for the group to vote on</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="poll-question">Question</Label>
                          <Input
                            id="poll-question"
                            placeholder="What should we do?"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Options (at least 2)</Label>
                          {pollOptions.map((opt, idx) => (
                            <Input
                              key={idx}
                              placeholder={`Option ${idx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                              }}
                            />
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPollOptions([...pollOptions, ""])}
                          >
                            Add Option
                          </Button>
                        </div>
                        <Button onClick={createPoll} className="w-full">Create Poll</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={send} disabled={!text.trim()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="members">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Add from followers/following</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[...followers, ...following].map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url || undefined} />
                            <AvatarFallback>{p.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{p.username}</div>
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => addMember(p.id)}>Add</Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">Current members</div>
                    {members.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 border rounded mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url || undefined} />
                            <AvatarFallback>{p.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm">{p.username}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => removeMember(p.id)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="settings">
                <div className="space-y-3">
                  <Input placeholder="Group name" defaultValue={group?.name} onBlur={(e) => saveSettings({ name: e.target.value })} />
                  <Input placeholder="Group description" defaultValue={group?.description || ''} onBlur={(e) => saveSettings({ description: e.target.value })} />
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


