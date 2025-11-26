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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

import { MessageSquare, BarChart3, Mic, Square, Plus, Smile, FileText, Image as ImageIcon, MoreVertical, Trash2, Download, Check, CheckCheck } from "lucide-react";

interface ProfileRow { id: string; username: string; email: string; avatar_url: string | null }

// Utility function to detect if a string contains only emojis
const isEmojiOnly = (text: string): boolean => {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+(\s*)$/u;
  return emojiRegex.test(text.trim());
};

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
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
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
      .select("id, content, audio_url, file_url, file_type, file_name, file_size, poll_data, is_read, created_at, sender_id, group_id, sender:profiles(id,username,avatar_url)")
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

      // Create poll data structure with voter tracking
      const pollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()).map(opt => ({ text: opt, votes: 0, voters: [] })),
        created_by: user.id,
        allow_multiple_votes: allowMultipleVotes,
        voted_users: [], // Track which users have voted
      };

      // Send poll as a chat message
      const { error: messageError } = await supabase.from("group_messages").insert({
        group_id: id,
        sender_id: user.id,
        content: `📊 Poll: ${pollQuestion.trim()}${allowMultipleVotes ? ' (Multiple votes allowed)' : ''}`,
        poll_data: pollData,
      });

      if (messageError) {
        toast.error("Failed to send poll: " + messageError.message);
        return;
      }

      // Clear poll form
      setPollQuestion("");
      setPollOptions(["", ""]);
      setAllowMultipleVotes(false);
      setPollDialogOpen(false);
      setAttachmentMenuOpen(false); // Close the plus menu
      await loadMessages();
      toast.success("Poll created!");
    } catch (error: any) {
      toast.error("Failed to create poll: " + error.message);
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

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (file: File, type: 'document' | 'photo') => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // File size validation
      const maxSize = type === 'document' ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for docs, 5MB for photos
      if (file.size > maxSize) {
        toast.error(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
        return;
      }

      const bucket = type === 'document' ? 'chat-documents' : 'chat-photos';
      const fileName = `${id}/${user.id}/${Date.now()}_${file.name}`;

      toast.info('Uploading...');

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: messageError } = await supabase
        .from("group_messages")
        .insert({
          group_id: id,
          sender_id: user.id,
          content: type === 'document' ? `📄 ${file.name}` : `📷 Photo`,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name,
          file_size: file.size
        });

      if (messageError) throw messageError;

      await loadMessages();
      toast.success('File sent!');
      setAttachmentMenuOpen(false);
    } catch (error: any) {
      toast.error('Failed to upload file: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      await loadMessages();
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error('Failed to delete message');
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
                <div className="h-[70vh] border rounded p-3 overflow-y-auto bg-background mb-2 space-y-2">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</div>
                  )}
                  {messages.map((m) => {
                    const isOwnMessage = me && m.sender_id === me.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} group`}
                      >
                        {/* Profile Photo */}
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={m.sender?.avatar_url || undefined} />
                          <AvatarFallback>{m.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>

                        {/* Message Bubble */}
                        <div
                          className={`flex-1 max-w-[70%] relative ${isOwnMessage ? 'items-end' : 'items-start'}`}
                          onMouseEnter={() => setHoveredMessageId(m.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          <div
                            className={`relative rounded-lg p-3 ${m.audio_url
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : isOwnMessage
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-white dark:bg-gray-800'
                              }`}
                          >
                            {/* Sender name */}
                            {!isOwnMessage && (
                              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                                {m.sender?.username || 'Unknown'}
                              </div>
                            )}

                            {/* Voice Note */}
                            {m.audio_url && (
                              <div className="flex items-center gap-2">
                                <audio controls src={m.audio_url} className="max-w-full h-8" />
                              </div>
                            )}

                            {/* Photo */}
                            {m.file_url && m.file_type?.startsWith('image/') && (
                              <div className="space-y-1">
                                <img
                                  src={m.file_url}
                                  alt={m.file_name || 'Photo'}
                                  className="max-w-full rounded cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(m.file_url, '_blank')}
                                />
                                {m.content !== '📷 Photo' && (
                                  <div className="text-sm">{m.content}</div>
                                )}
                              </div>
                            )}

                            {/* Document */}
                            {m.file_url && !m.file_type?.startsWith('image/') && !m.audio_url && (
                              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded">
                                <FileText className="h-8 w-8 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{m.file_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : ''}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(m.file_url, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}

                            {/* Poll Display */}
                            {m.poll_data && (
                              <div className="space-y-3 min-w-[280px]">
                                <div className="font-semibold text-sm">{m.poll_data.question}</div>
                                <div className="space-y-2">
                                  {m.poll_data.options?.map((option: any, idx: number) => {
                                    const totalVotes = m.poll_data.options?.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0) || 0;
                                    const percentage = totalVotes > 0 ? Math.round((option.votes || 0) / totalVotes * 100) : 0;

                                    return (
                                      <button
                                        key={idx}
                                        className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative overflow-hidden"
                                        onClick={async () => {
                                          // Handle vote
                                          try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) {
                                              toast.error('Please login to vote');
                                              return;
                                            }

                                            const newPollData = { ...m.poll_data };
                                            const allowMultiple = newPollData.allow_multiple_votes;

                                            // Check if user already voted for THIS specific option
                                            const alreadyVotedForThis = newPollData.options[idx]?.voters?.includes(user.id);
                                            if (alreadyVotedForThis) {
                                              toast.error('You already voted for this option');
                                              return;
                                            }

                                            // If multiple answers NOT allowed, remove user's previous vote
                                            if (!allowMultiple) {
                                              newPollData.options = newPollData.options.map((opt: any) => {
                                                const voters = opt.voters || [];
                                                if (voters.includes(user.id)) {
                                                  // Remove user's vote from this option
                                                  return {
                                                    ...opt,
                                                    votes: Math.max((opt.votes || 0) - 1, 0),
                                                    voters: voters.filter((v: string) => v !== user.id)
                                                  };
                                                }
                                                return opt;
                                              });
                                            }

                                            // Add vote to the selected option
                                            newPollData.options = newPollData.options.map((opt: any, i: number) => {
                                              if (i === idx) {
                                                const voters = opt.voters || [];
                                                return {
                                                  ...opt,
                                                  votes: (opt.votes || 0) + 1,
                                                  voters: [...voters, user.id]
                                                };
                                              }
                                              return opt;
                                            });

                                            await supabase
                                              .from('group_messages')
                                              .update({ poll_data: newPollData })
                                              .eq('id', m.id);

                                            await loadMessages();
                                            toast.success('Vote recorded!');
                                          } catch (error) {
                                            toast.error('Failed to vote');
                                          }
                                        }}
                                      >
                                        {/* Progress bar background */}
                                        <div
                                          className="absolute inset-0 bg-teal-100 dark:bg-teal-900/30 transition-all duration-300"
                                          style={{ width: `${percentage}%` }}
                                        />

                                        {/* Content */}
                                        <div className="relative flex items-center justify-between">
                                          <span className="text-sm font-medium">{option.text}</span>
                                          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                            {percentage}% ({option.votes || 0})
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {m.poll_data.options?.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0) || 0} votes
                                </div>
                              </div>
                            )}

                            {/* Text Message */}
                            {!m.audio_url && !m.file_url && !m.poll_data && (
                              <div className={`break-words whitespace-pre-wrap ${isEmojiOnly(m.content) ? 'text-4xl leading-relaxed' : 'text-sm'
                                }`}>
                                {m.content}
                              </div>
                            )}

                            {/* Timestamp & Read Receipts */}
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <span className="text-xs text-muted-foreground">
                                {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isOwnMessage && (
                                m.is_read ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <CheckCheck className="h-3 w-3 text-gray-400" />
                                )
                              )}
                            </div>
                          </div>

                          {/* 3-Dot Menu (hover only) */}
                          {hoveredMessageId === m.id && isOwnMessage && (
                            <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'}`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleDeleteMessage(m.id)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  <div className="flex gap-2 items-center">
                    {/* Plus Icon Menu for Attachments */}
                    <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2">
                        <div className="space-y-1">
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <span>Document</span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'document');
                              }}
                            />
                          </label>

                          <label className="cursor-pointer">
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                              <ImageIcon className="h-5 w-5 text-purple-500" />
                              <span>Photos</span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, 'photo');
                              }}
                            />
                          </label>

                          <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
                            <DialogTrigger asChild>
                              <div className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer">
                                <BarChart3 className="h-5 w-5 text-green-500" />
                                <span>Poll</span>
                              </div>
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
                                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                  <input
                                    type="checkbox"
                                    id="allow-multiple-votes"
                                    checked={allowMultipleVotes}
                                    onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                                    className="h4 w-4 rounded border-gray-300"
                                  />
                                  <Label htmlFor="allow-multiple-votes" className="cursor-pointer flex-1">
                                    Allow multiple answer
                                  </Label>
                                </div>
                                <Button onClick={createPoll} className="w-full">Create Poll</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Text Input */}
                    <div className="flex-1 relative">
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
                        className="flex-1 rounded-full pr-12"
                        disabled={isRecording || !!audioBlob}
                      />

                      {/* Emoji Picker Button */}
                      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 border-0" align="end">
                          <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Voice Note or Send Button */}
                    {text.trim() || audioBlob ? (
                      <Button
                        onClick={send}
                        disabled={isRecording}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full h-10 w-10 p-0 flex-shrink-0"
                        size="icon"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? "Stop recording" : "Record voice note"}
                        className={`rounded-full h-10 w-10 flex-shrink-0 ${isRecording ? "bg-red-500 text-white hover:bg-red-600" : "hover:bg-accent"}`}
                      >
                        {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
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
    </div >
  );
}


