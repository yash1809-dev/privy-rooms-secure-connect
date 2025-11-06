import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function VoiceNotesToText({ groupId }: { groupId?: string }) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef("");

  useEffect(() => {
    // Basic browser speech recognition fallback
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setStatus("Listening…");
      recognition.onerror = (e: any) => {
        setStatus(`Error: ${e.error || "unknown"}`);
      };
      recognition.onresult = async (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            interimRef.current = "";
            setTranscript((prev) => (prev ? prev + "\n" : "") + text);
            if (groupId) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("group_notes").insert({ group_id: groupId, author_id: user.id, content: text });
              }
            }
          } else {
            interimRef.current = text;
          }
        }
      };
      recognition.onend = () => {
        setStatus("Idle");
        if (recording) {
          try { recognition.start(); setStatus("Listening…"); } catch {}
        }
      };
      recognitionRef.current = recognition;
    } else {
      setSupported(false);
      recognitionRef.current = null;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setTranscript("Speech recognition not supported in this browser. Try Chrome on desktop or Android.");
      return;
    }
    const doToggle = async () => {
      if (recording) {
        try { recognitionRef.current.stop(); } catch {}
        setRecording(false);
      } else {
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } catch (e) {
          setStatus("Microphone permission denied");
        }
        setTranscript("");
        interimRef.current = "";
        try { recognitionRef.current.start(); setStatus("Listening…"); } catch (e) { setStatus("Unable to start recognition"); }
        setRecording(true);
      }
    };
    void doToggle();
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Voice Notes → Text</CardTitle>
        <CardDescription>Convert quick voice notes into written notes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={toggleRecording}>
          {recording ? "Stop Recording" : "Start Recording"}
        </Button>
        {status && <div className="text-xs text-muted-foreground">{status}</div>}
        <div className="p-3 rounded border min-h-20 text-sm whitespace-pre-wrap">
          {groupId
            ? ((transcript + (interimRef.current ? (transcript ? "\n" : "") + interimRef.current : "")) || "Your transcription will appear here...")
            : "No data available"}
        </div>
        {!supported && <div className="text-xs text-muted-foreground">Speech recognition not supported in this browser.</div>}
      </CardContent>
    </Card>
  );
}


