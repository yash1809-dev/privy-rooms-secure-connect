import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Features() {
  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">All the goodies</h1>
          <p className="text-muted-foreground mt-3">Room themes, mood boards, mini-dashboard, AI recaps, smart polls, and voice-to-text.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Themes</CardTitle>
              <CardDescription>Custom color schemes and backgrounds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <span className="h-8 w-16 rounded bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20"></span>
                <span className="h-8 w-16 rounded bg-gradient-to-r from-rose-500/20 via-orange-500/20 to-amber-500/20"></span>
                <span className="h-8 w-16 rounded bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-cyan-500/20"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mood Board</CardTitle>
              <CardDescription>Show the vibe of the room</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge>🎓 Studying</Badge>
              <Badge>🍿 Chilling</Badge>
              <Badge>💡 Brainstorming</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mini-dashboard</CardTitle>
              <CardDescription>Pinned files, polls and notes up top</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Keep important artifacts visible and accessible.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Room Recaps</CardTitle>
              <CardDescription>Auto-summarize daily group activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Decisions, highlights, and actions—at a glance.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smart Polls</CardTitle>
              <CardDescription>Beautiful charts for instant clarity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Run quick decisions and visualize results.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice Notes → Text</CardTitle>
              <CardDescription>Capture thoughts on the go</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Speak your notes and we transcribe them automatically.</div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-10">
          <Link to="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}


