import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function VoiceNotesToText({ groupId }: { groupId?: string }) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
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
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setTranscript("Speech recognition not supported in this browser.");
      return;
    }
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setRecording(true);
    }
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
        <div className="p-3 rounded border min-h-20 text-sm whitespace-pre-wrap">
          {groupId ? (transcript || "Your transcription will appear here...") : "No data available"}
        </div>
      </CardContent>
    </Card>
  );
}


