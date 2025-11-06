import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const samplePollData = [
  { option: "Option A", votes: 42 },
  { option: "Option B", votes: 27 },
  { option: "Option C", votes: 12 },
];

export default function MiniDashboard() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Mini-dashboard</CardTitle>
        <CardDescription>Quick access to pinned files, polls, and notes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded border">
              <div>
                <div className="font-medium">Project Plan.pdf</div>
                <div className="text-xs text-muted-foreground">Pinned • 2.4 MB</div>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded border">
              <div>
                <div className="font-medium">Sprint Board.png</div>
                <div className="text-xs text-muted-foreground">Pinned • 820 KB</div>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
          </TabsContent>

          <TabsContent value="polls" className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={samplePollData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="option" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground">Smart Polls — live results preview</div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-3">
            <div className="p-3 rounded border">
              <div className="text-sm">Reminder: Synthesize recap before 6pm.</div>
              <Progress value={66} className="mt-2" />
            </div>
            <div className="p-3 rounded border">
              <div className="text-sm">Brainstorm topics: onboarding, pricing, roadmap.</div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


