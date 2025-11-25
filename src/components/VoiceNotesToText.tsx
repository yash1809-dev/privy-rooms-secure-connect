import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfDay, endOfDay, isToday } from "date-fns";
import { Mic, Square, ArrowUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VoiceRecording = {
  id: string;
  heading: string;
  createdAt: Date;
  audioUrl: string;
  transcript: string;
  showTranscript: boolean;
};

export default function VoiceNotesToText({ groupId, selectedDate }: { groupId?: string; selectedDate?: Date }) {
  const [headingInput, setHeadingInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [mediaSupported, setMediaSupported] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [activeDay, setActiveDay] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const recognitionRef = useRef<any>(null);
  const interimRef = useRef("");
  const transcriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef(false);
  const recordingsRef = useRef<VoiceRecording[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load recordings from database based on selectedDate
  useEffect(() => {
    loadRecordings();
  }, [selectedDate]);

  // Initialize speech recognition
  useEffect(() => {
    const RecognitionConstructor =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!RecognitionConstructor) {
      setSupported(false);
      recognitionRef.current = null;
    } else {
      const recognition = new RecognitionConstructor();
      recognition.continuous = true;
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            transcriptRef.current = transcriptRef.current
              ? `${transcriptRef.current}\\n${text}`
              : text;
            interimRef.current = "";
          } else {
            interimRef.current = text;
          }
        }

        const combined = `${transcriptRef.current}${interimRef.current ? `\\n${interimRef.current}` : ""
          }`;
        setLiveTranscript(combined.trim());
      };

      recognition.onerror = (e: any) => setStatus(`Transcription error: ${e.error || "unknown"}`);
      recognition.onstart = () => setStatus("Recording & transcribing…");
      recognition.onend = () => {
        if (recordingRef.current) {
          try {
            recognition.start();
          } catch {
            setStatus("Unable to resume transcription");
          }
        } else {
          setStatus("Idle");
        }
      };

      recognitionRef.current = recognition;
    }

    if (!(navigator?.mediaDevices && (window as any).MediaRecorder)) {
      setMediaSupported(false);
    }

    return () => {
      recognitionRef.current?.stop?.();
      recordingsRef.current.forEach((rec) => URL.revokeObjectURL(rec.audioUrl));
    };
  }, []);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine date range to query
      const targetDate = selectedDate || new Date();
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);

      // Query database for recordings in date range
      const { data, error } = await supabase
        .from("voice_recordings" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("recorded_at", start.toISOString())
        .lte("recorded_at", end.toISOString())
        .order("recorded_at", { ascending: false });

      if (error) {
        console.error("Failed to load recordings:", error);
        toast.error("Failed to load recordings");
        return;
      }

      // Transform database records to VoiceRecording type
      const loadedRecordings: VoiceRecording[] = (data || []).map((record: any) => ({
        id: record.id,
        heading: record.heading,
        createdAt: new Date(record.recorded_at),
        audioUrl: record.audio_url,
        transcript: record.transcript || "",
        showTranscript: false,
      }));

      setRecordings(loadedRecordings);
    } catch (error) {
      console.error("Error loading recordings:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupedRecordings = useMemo(() => {
    const groups = recordings.reduce<Record<string, VoiceRecording[]>>((acc, note) => {
      const dayKey = format(note.createdAt, "yyyy-MM-dd");
      acc[dayKey] = acc[dayKey] ? [...acc[dayKey], note] : [note];
      return acc;
    }, {});

    return Object.entries(groups)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dayKey, notes]) => ({
        dayKey,
        label: format(notes[0].createdAt, "d MMMM"),
        notes: notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      }));
  }, [recordings]);

  useEffect(() => {
    if (!activeDay && groupedRecordings.length) {
      setActiveDay(groupedRecordings[0].dayKey);
    }
  }, [activeDay, groupedRecordings]);

  const uploadAudioToStorage = async (audioBlob: Blob, userId: string, timestamp: number): Promise<string | null> => {
    try {
      const fileName = `${userId}/${timestamp}.webm`;
      const { data, error } = await supabase.storage
        .from("voice-recordings")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("voice-recordings")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Failed to upload audio:", error);
      return null;
    }
  };

  const finalizeRecording = async () => {
    if (!audioChunksRef.current.length) {
      setStatus("No audio captured");
      return;
    }

    setUploading(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const capturedAt = new Date();
    const heading = headingInput.trim() || "Voice note";
    const transcript = transcriptRef.current.trim();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save recordings");
        return;
      }

      // Upload audio to Supabase Storage
      const audioUrl = await uploadAudioToStorage(audioBlob, user.id, capturedAt.getTime());

      if (!audioUrl) {
        toast.error("Failed to upload audio file");
        return;
      }

      // Save metadata to database
      const { data: dbRecord, error: dbError } = await supabase
        .from("voice_recordings" as any)
        .insert({
          user_id: user.id,
          group_id: groupId || null,
          heading,
          transcript,
          audio_url: audioUrl,
          recorded_at: capturedAt.toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add to local state
      const newRecording: VoiceRecording = {
        id: dbRecord.id,
        heading,
        createdAt: capturedAt,
        audioUrl,
        transcript,
        showTranscript: false,
      };

      setRecordings((prev) => [newRecording, ...prev]);
      setStatus("Saved voice note");
      toast.success("Recording saved successfully");

      // Sync transcript to group_notes if in a group
      if (groupId && transcript) {
        try {
          await supabase.from("group_notes").insert({
            group_id: groupId,
            author_id: user.id,
            content: transcript,
          });
        } catch {
          toast.warning("Saved locally but failed to sync with the group");
        }
      }
    } catch (error) {
      console.error("Failed to save recording:", error);
      toast.error("Failed to save recording");
    } finally {
      setUploading(false);
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      transcriptRef.current = "";
      interimRef.current = "";
      setLiveTranscript("");
      setHeadingInput("");
      setRecording(false);
      recordingRef.current = false;
    }
  };

  const startRecording = async () => {
    if (!mediaSupported) {
      setStatus("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptRef.current = "";
      interimRef.current = "";
      setLiveTranscript("");

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        currentStreamRef.current?.getTracks().forEach((track) => track.stop());
        currentStreamRef.current = null;
        void finalizeRecording();
      };

      mediaRecorder.start();
      setRecording(true);
      recordingRef.current = true;
      setStatus("Recording…");

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          setStatus("Audio saved, but transcription failed to start");
        }
      }
    } catch (error) {
      setStatus("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      setRecording(false);
      recordingRef.current = false;
    }

    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop());
      currentStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setStatus("Unable to stop transcription cleanly");
      }
    }

    setStatus("Processing recording…");
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  const toggleTranscript = (id: string) => {
    setRecordings((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, showTranscript: !note.showTranscript } : note,
      ),
    );
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 200);
  };

  // Show different title and description based on selected date
  const isViewingToday = !selectedDate || isToday(selectedDate);
  const dateLabel = selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today";

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Voice Notes → Text</CardTitle>
        <CardDescription>
          {isViewingToday
            ? "Capture audio with a heading, then group recordings by day and transcribe on demand."
            : `Viewing recordings from ${dateLabel}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isViewingToday && (
          <>
            <div className="space-y-2">
              <Label htmlFor="voice-note-heading">Recording heading</Label>
              <Input
                id="voice-note-heading"
                placeholder="e.g. Weekly sync prep"
                value={headingInput}
                onChange={(event) => setHeadingInput(event.target.value)}
                disabled={recording || uploading}
              />
              <p className="text-xs text-muted-foreground">
                The exact time and date are saved automatically with every note.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button size="sm" onClick={toggleRecording} disabled={!mediaSupported || uploading}>
                {recording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start recording
                  </>
                )}
              </Button>
              {status && <div className="text-xs text-muted-foreground">{status}</div>}
              {uploading && <div className="text-xs text-primary">Uploading...</div>}
            </div>

            <div className="rounded border bg-background p-3 text-sm text-muted-foreground min-h-24">
              {recording ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Live transcript</p>
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-foreground">
                    {liveTranscript || "Listening…"}
                  </div>
                </div>
              ) : (
                <p>Set a heading, start recording, and your note will be saved with today's date.</p>
              )}
            </div>

            {!supported && (
              <div className="text-xs text-muted-foreground">
                Transcription requires a browser that supports the Web Speech API (Chrome or Edge).
              </div>
            )}

            {!mediaSupported && (
              <div className="text-xs text-muted-foreground">
                This browser does not support in-app audio recording. Please switch to a modern desktop
                browser.
              </div>
            )}
          </>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading recordings...</p>
          </div>
        ) : groupedRecordings.length ? (
          <div className="space-y-3 relative">
            <p className="text-sm font-medium text-foreground">Recordings by day</p>
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="max-h-[600px] overflow-y-auto relative"
            >
              <Accordion
                type="single"
                collapsible
                value={activeDay ?? ""}
                onValueChange={(value) => setActiveDay(value || undefined)}
              >
                {groupedRecordings.map((group) => (
                  <AccordionItem key={group.dayKey} value={group.dayKey}>
                    <AccordionTrigger>
                      <div className="flex w-full items-center justify-between pr-4">
                        <span className="font-semibold">{group.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {group.notes.length} {group.notes.length === 1 ? "recording" : "recordings"}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {group.notes.map((note) => (
                          <div key={note.id} className="rounded border p-3">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-foreground">{note.heading}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(note.createdAt, "p '•' MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <audio controls className="mt-3 w-full" src={note.audioUrl} />
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleTranscript(note.id)}
                                disabled={!supported || !note.transcript}
                              >
                                {note.showTranscript ? "Hide transcript" : "Transcribe"}
                              </Button>
                              {!note.transcript && (
                                <span className="text-xs text-muted-foreground">
                                  Transcript unavailable for this recording.
                                </span>
                              )}
                            </div>
                            {note.showTranscript && note.transcript && (
                              <div className="mt-3 rounded bg-muted p-2 text-sm whitespace-pre-wrap">
                                {note.transcript}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            {showScrollTop && (
              <Button
                size="icon"
                variant="secondary"
                className="fixed bottom-8 right-8 rounded-full shadow-lg z-10"
                onClick={scrollToTop}
                title="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            {isViewingToday
              ? "Your recordings will be grouped by day. Start by capturing your first note."
              : `No recordings on ${dateLabel}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
