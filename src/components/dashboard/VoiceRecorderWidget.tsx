
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function VoiceRecorderWidget() {
    const [recording, setRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [status, setStatus] = useState("Ready to record");
    const [processing, setProcessing] = useState(false);

    // Refs for media recording
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const transcriptRef = useRef("");
    const interimRef = useRef("");

    // Initialize Speech Recognition
    useEffect(() => {
        const RecognitionConstructor =
            (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

        if (RecognitionConstructor) {
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
                            ? `${transcriptRef.current} ${text}`
                            : text;
                        interimRef.current = "";
                    } else {
                        interimRef.current = text;
                    }
                }
                setLiveTranscript(
                    `${transcriptRef.current} ${interimRef.current}`.trim()
                );
            };

            recognition.onerror = (e: any) => setStatus("Error: " + e.error);
            recognitionRef.current = recognition;
        }
    }, []);

    const startInfo = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                void saveRecording();
            };

            mediaRecorder.start();
            if (recognitionRef.current) recognitionRef.current.start();

            setRecording(true);
            setStatus("Recording...");
            setLiveTranscript("");
            transcriptRef.current = "";
            interimRef.current = "";
        } catch (e) {
            console.error(e);
            toast.error("Microphone access denied or not supported.");
        }
    };

    const stopInfo = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            if (recognitionRef.current) recognitionRef.current.stop();
            setRecording(false);
            setStatus("Processing...");
            setProcessing(true);
        }
    };

    const saveRecording = async () => {
        // Logic to save to Supabase (Simulated or Copied)
        // For this widget, we connect to the same DB logic
        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setProcessing(false);
                return;
            }

            const timestamp = Date.now();
            const fileName = `${user.id}/${timestamp}.webm`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from("voice-recordings")
                .upload(fileName, audioBlob);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from("voice-recordings")
                .getPublicUrl(fileName);

            // Insert DB
            await supabase.from("voice_recordings" as any).insert({
                user_id: user.id,
                heading: "Quick Voice Note",
                transcript: transcriptRef.current,
                audio_url: urlData.publicUrl,
                recorded_at: new Date().toISOString()
            });

            toast.success("Voice note saved!");
            setStatus("Saved!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save recording");
            setStatus("Error saving");
        } finally {
            setProcessing(false);
            setTimeout(() => setStatus("Ready to record"), 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-6 h-full min-h-[300px]">

            {/* Visualizer / Status */}
            <div className="flex flex-col items-center space-y-2 h-24 justify-end">
                {recording ? (
                    <div className="flex items-center gap-1 h-8">
                        {[1, 2, 3, 4, 5, 4, 3, 2].map((i) => (
                            <div
                                key={i}
                                className="w-1 bg-red-500 rounded-full animate-bounce"
                                style={{
                                    height: `${i * 6}px`,
                                    animationDuration: '0.8s',
                                    animationDelay: `${i * 0.1}s`
                                }}
                            />
                        ))}
                    </div>
                ) : processing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                    <div className="text-muted-foreground/50">
                        <Mic className="h-8 w-8" />
                    </div>
                )}
                <p className="text-sm font-medium text-muted-foreground animate-in fade-in">
                    {status}
                </p>
            </div>

            {/* Main Action Button */}
            <Button
                size="lg"
                variant={recording ? "destructive" : "default"}
                className="h-24 w-24 rounded-full shadow-xl hover:scale-105 transition-all duration-300 relative group"
                onClick={recording ? stopInfo : startInfo}
                disabled={processing}
            >
                {recording ? (
                    <Square className="h-10 w-10 fill-current" />
                ) : (
                    <Mic className="h-10 w-10" />
                )}
                {!recording && !processing && (
                    <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                )}
            </Button>

            {/* Live Transcript Preview */}
            <div className="w-full max-w-sm bg-muted/30 rounded-xl p-4 min-h-[80px] text-center border overflow-hidden relative">
                {liveTranscript ? (
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                        "{liveTranscript}"
                    </p>
                ) : (
                    <div className="flex flex-col items-center text-muted-foreground text-xs gap-1 opacity-60">
                        <Sparkles className="h-4 w-4" />
                        <span>Transcript will appear here...</span>
                    </div>
                )}
            </div>

        </div>
    );
}
