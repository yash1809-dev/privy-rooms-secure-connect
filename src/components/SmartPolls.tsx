import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export default function SmartPolls({ groupId }: { groupId?: string }) {
  const [poll, setPoll] = useState<any | null>(null);
  const [votes, setVotes] = useState<any[]>([]);

  const load = async () => {
    if (!groupId) return;
    const p = await supabase.from("group_polls").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(1).single();
    setPoll(p.data || null);
    if (p.data) {
      const v = await supabase.from("group_poll_votes").select("*").eq("poll_id", p.data.id);
      setVotes(v.data || []);
    } else {
      setVotes([]);
    }
  };

  useEffect(() => {
    load();
    if (!groupId) return;
    const channel = supabase.channel(`polls_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_polls', filter: `group_id=eq.${groupId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_poll_votes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const data = useMemo(() => {
    if (!poll) return [];
    const counts = new Array(poll.options.length).fill(0);
    votes.forEach((v) => { counts[v.option_index] = (counts[v.option_index] || 0) + 1; });
    return poll.options.map((o: string, i: number) => ({ option: o, votes: counts[i] || 0 }));
  }, [poll, votes]);

  const vote = async (index: number) => {
    if (!poll) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("group_poll_votes").insert({ poll_id: poll.id, voter_id: user.id, option_index: index });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Smart Polls</CardTitle>
        <CardDescription>Visualize results beautifully</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!groupId && <div className="text-sm text-muted-foreground">No data available</div>}
        {groupId && !poll && <div className="text-sm text-muted-foreground">No polls yet</div>}
        {groupId && poll && (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="option" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2 flex-wrap">
              {poll.options.map((o: string, i: number) => (
                <Button key={i} size="sm" onClick={() => vote(i)}>{o}</Button>
              ))}
              <Button size="sm" variant="outline" onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !groupId) return;
                await supabase.from("group_polls").insert({ group_id: groupId, question: "New poll?", options: ["Yes","No"], created_by: user.id });
              }}>Create Poll</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


