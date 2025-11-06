import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { toast } from "sonner";

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
      } catch (e: any) {
        setPermissionsError("Camera/Microphone permission denied. Please enable to join the call.");
        toast.error("Unable to access camera/mic");
      }
    };
    start();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Room</CardTitle>
              <CardDescription>Share this room link to invite others</CardDescription>
            </div>
            {id && <ShareLinkButton id={id} type="room" name={`Room ${id.slice(0, 6)}`} />}
          </CardHeader>
          <CardContent>
            {permissionsError && (
              <div className="p-3 mb-4 rounded border text-sm text-red-600 bg-red-50 dark:bg-red-950/20">
                {permissionsError}
              </div>
            )}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="aspect-video bg-black rounded overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)}>Leave</Button>
                  {id && (
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy Link</Button>
                  )}
                </div>
              </div>
              <div>
                <div className="p-3 rounded border text-sm text-muted-foreground">
                  Invite friends with the link or a code:
                  <div className="font-mono text-base mt-2">{id}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


