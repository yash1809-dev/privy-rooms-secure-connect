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

import { MessageSquare, BarChart3, Mic, Square, Play, Pause } from "lucide-react";

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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      .select("id, content, audio_url, created_at, sender_id, group_id, sender:profiles(id,username,avatar_url)")
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Failed to access microphone");
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSlideOffset(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSlideOffset(0);
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.info("Recording cancelled");
    }
  };

  // Touch handlers for slide-to-cancel
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRecording) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRecording && touchStartX > 0) {
      const currentX = e.touches[0].clientX;
      const diff = touchStartX - currentX;
      if (diff > 0) {
        setSlideOffset(Math.min(diff, 150));
        if (diff > 150) {
          cancelRecording();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isRecording && slideOffset < 150) {
      setSlideOffset(0);
    }
    setTouchStartX(0);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload audio to storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-recordings')
        .getPublicUrl(fileName);

      // Send as message with audio URL
      const { error: messageError } = await supabase
        .from("group_messages")
        .insert({
          group_id: id,
          sender_id: user.id,
          content: `🎤 Voice message (${recordingTime}s)`,
          audio_url: publicUrl
        });

      if (messageError) throw messageError;

      setAudioBlob(null);
      setRecordingTime(0);
      await loadMessages();
      toast.success("Voice note sent!");
    } catch (error: any) {
      toast.error("Failed to send voice note: " + (error.message || "Unknown error"));
      console.error(error);
    }
  };

  const cancelVoiceNote = () => {
    setAudioBlob(null);
    setRecordingTime(0);
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

                        {/* Show audio player for voice notes */}
                        {m.audio_url ? (
                          <div className="mt-1">
                            <div className="text-sm text-muted-foreground mb-1">{m.content}</div>
                            <audio controls src={m.audio_url} className="max-w-full" />
                          </div>
                        ) : (
                          <div className="text-sm break-words">{m.content}</div>
                        )}

                        <div className="text-xs text-muted-foreground mt-1">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="space-y-2">
                  {/* Voice note preview - WhatsApp style */}
                  {audioBlob && (
                    <div className="flex items-center gap-3 p-3 bg-accent rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm font-medium">Voice message</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
                      </div>
                      <Button
                        size="icon"
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full h-12 w-12"
                        onClick={sendVoiceNote}
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelVoiceNote}
                        className="h-12 w-12"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  )}

                  {/* Recording indicator - WhatsApp style */}
                  {isRecording && (
                    <div
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg border border-red-200 dark:border-red-900 transition-transform touch-none"
                      style={{ transform: `translateX(-${slideOffset}px)`, opacity: 1 - (slideOffset / 200) }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                        </div>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Waveform animation */}
                      <div className="flex-1 flex items-center justify-center gap-1 h-8">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-red-500 rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                              animationDelay: `${i * 0.05}s`,
                              animationDuration: `${0.5 + Math.random() * 0.5}s`
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {slideOffset > 50 ? '🚫 Release to cancel' : '← Slide to cancel'}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white"
                          onClick={stopRecording}
                        >
                          <Square className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message input - WhatsApp style */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 flex gap-2">
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
                        className="flex-1 rounded-full"
                        disabled={isRecording || !!audioBlob}
                      />

                      {/* Voice note button - WhatsApp style */}
                      {!text.trim() && !audioBlob && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={isRecording ? stopRecording : startRecording}
                          title={isRecording ? "Stop recording" : "Record voice note"}
                          className={`rounded-full h-10 w-10 ${isRecording ? "bg-red-500 text-white hover:bg-red-600" : "hover:bg-accent"}`}
                        >
                          {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      )}

                      {/* Poll button */}
                      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" title="Create Poll">
                            <BarChart3 className="h-5 w-5" />
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
                    </div>

                    {/* Send button - WhatsApp style green button */}
                    {(text.trim() || audioBlob) && (
                      <Button
                        onClick={send}
                        disabled={isRecording}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full h-10 w-10 p-0"
                        size="icon"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </Button>
                    )}
                  </div>
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


