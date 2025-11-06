import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VoiceNotesToText() {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Basic browser speech recognition fallback
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let combined = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        setTranscript((prev) => (prev + " " + combined).trim());
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
          {transcript || "Your transcription will appear here..."}
        </div>
      </CardContent>
    </Card>
  );
}


