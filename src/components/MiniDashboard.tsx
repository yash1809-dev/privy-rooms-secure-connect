import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export default function MiniDashboard({ groupId }: { groupId?: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      const [n, p] = await Promise.all([
        supabase.from("group_notes").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(5),
        supabase.from("group_polls").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(1),
      ]);
      setNotes(n.data || []);
      setPolls(p.data || []);
    };
    load();
    const channel = supabase.channel(`mini_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_notes', filter: `group_id=eq.${groupId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_polls', filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

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
            {!groupId && <div className="text-sm text-muted-foreground">No data available</div>}
            {groupId && <div className="text-sm text-muted-foreground">No files pinned yet</div>}
          </TabsContent>

          <TabsContent value="polls" className="space-y-4">
            {!groupId && <div className="text-sm text-muted-foreground">No data available</div>}
            {groupId && polls.length === 0 && <div className="text-sm text-muted-foreground">No polls yet</div>}
            {groupId && polls.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(polls[0].options as string[]).map((opt: string, idx: number) => ({ option: opt, votes: 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="option" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3">
            {!groupId && <div className="text-sm text-muted-foreground">No data available</div>}
            {groupId && notes.length === 0 && <div className="text-sm text-muted-foreground">No notes yet</div>}
            {groupId && notes.map((n) => (
              <div key={n.id} className="p-3 rounded border">
                <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                <Progress value={100} className="mt-2" />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


