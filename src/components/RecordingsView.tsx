import { format } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VoiceRecording {
    id: string;
    heading: string;
    createdAt: Date;
    audioUrl: string;
    transcript: string;
    showTranscript: boolean;
}

interface RecordingsViewProps {
    date: Date;
    recordings: VoiceRecording[];
    onBack: () => void;
    onToggleTranscript: (id: string) => void;
    supported: boolean;
}

export function RecordingsView({
    date,
    recordings,
    onBack,
    onToggleTranscript,
    supported,
}: RecordingsViewProps) {
    return (
        <Card className="mb-8">
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-sm">{format(date, "MMMM d, yyyy")}</span>
                    </div>
                </div>
                <CardTitle>Recordings from {format(date, "MMMM d")}</CardTitle>
                <CardDescription>
                    {recordings.length} {recordings.length === 1 ? "recording" : "recordings"} on this day
                </CardDescription>
            </CardHeader>
            <CardContent>
                {recordings.length > 0 ? (
                    <div className="space-y-4">
                        {recordings.map((note) => (
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
                                        onClick={() => onToggleTranscript(note.id)}
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
                ) : (
                    <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recordings on this date</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
