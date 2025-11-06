import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RoomRecap() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>AI Room Recap</CardTitle>
        <CardDescription>Auto-summarized daily activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm leading-6 text-muted-foreground">
          • Decisions: Move launch to next Tuesday; finalize onboarding flow.
          <br />• Highlights: 3 docs updated, 2 polls closed, 14 messages.
          <br />• Action items: Draft pricing FAQ, record demo clip, schedule user interviews.
        </div>
        <div className="flex gap-2">
          <Button size="sm">Regenerate</Button>
          <Button size="sm" variant="outline">Copy</Button>
        </div>
      </CardContent>
    </Card>
  );
}


