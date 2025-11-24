import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Mic, Square } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

type VoiceRecording = {
  id: string;
  heading: string;
  createdAt: Date;
  audioUrl: string;
  transcript: string;
  showTranscript: boolean;
};

export default function VoiceNotesToText({ groupId }: { groupId?: string }) {
  const [headingInput, setHeadingInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [mediaSupported, setMediaSupported] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [activeDay, setActiveDay] = useState<string | undefined>(undefined);

  const recognitionRef = useRef<any>(null);
  const interimRef = useRef("");
  const transcriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef(false);
  const recordingsRef = useRef<VoiceRecording[]>([]);

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
              ? `${transcriptRef.current}\n${text}`
              : text;
            interimRef.current = "";
          } else {
            interimRef.current = text;
          }
        }

        const combined = `${transcriptRef.current}${
          interimRef.current ? `\n${interimRef.current}` : ""
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

  const finalizeRecording = async () => {
    if (!audioChunksRef.current.length) {
      setStatus("No audio captured");
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const capturedAt = new Date();
    const dayKey = format(capturedAt, "yyyy-MM-dd");
    const heading = headingInput.trim() || "Voice note";
    const transcript = transcriptRef.current.trim();

    const newRecording: VoiceRecording = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      heading,
      createdAt: capturedAt,
      audioUrl,
      transcript,
      showTranscript: false,
    };

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    transcriptRef.current = "";
    interimRef.current = "";
    setLiveTranscript("");
    setHeadingInput("");
    setRecording(false);
    recordingRef.current = false;

    setRecordings((prev) => [newRecording, ...prev]);
    setActiveDay(dayKey);
    setStatus("Saved voice note");

    if (groupId && transcript) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("group_notes").insert({
            group_id: groupId,
            author_id: user.id,
            content: transcript,
          });
        }
      } catch {
        setStatus("Saved locally but failed to sync with the group");
      }
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Voice Notes → Text</CardTitle>
        <CardDescription>
          Capture audio with a heading, then group recordings by day and transcribe on demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="voice-note-heading">Recording heading</Label>
          <Input
            id="voice-note-heading"
            placeholder="e.g. Weekly sync prep"
            value={headingInput}
            onChange={(event) => setHeadingInput(event.target.value)}
            disabled={recording}
          />
          <p className="text-xs text-muted-foreground">
            The exact time and date are saved automatically with every note.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="sm" onClick={toggleRecording} disabled={!mediaSupported}>
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
            <p>Set a heading, start recording, and your note will be saved with today’s date.</p>
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

        {groupedRecordings.length ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Recordings by day</p>
            <Accordion
              type="single"
              collapsible
              value={activeDay ?? ""}
              onValueChange={(value) => setActiveDay(value || undefined)}
            >
              {groupedRecordings.map((group) => (
                <AccordionItem key={group.dayKey} value={group.dayKey}>
                  <AccordionTrigger className="flex-col items-start gap-1">
                    <div className="flex w-full items-center justify-between">
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
        ) : (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            Your recordings will be grouped by day. Start by capturing your first note.
          </div>
        )}
      </CardContent>
    </Card>
  );
}



