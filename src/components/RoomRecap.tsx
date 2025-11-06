import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function RoomRecap({ groupId }: { groupId?: string }) {
  const [recap, setRecap] = useState<any | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      const { data } = await supabase.from("group_recaps").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(1).single();
      setRecap(data || null);
    };
    load();
    const channel = supabase.channel(`recap_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_recaps', filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const regenerate = async () => {
    if (!groupId) return;
    const content = "• Decisions: ...\n• Highlights: ...\n• Action items: ...";
    await supabase.from("group_recaps").insert({ group_id: groupId, content });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>AI Room Recap</CardTitle>
        <CardDescription>Auto-summarized daily activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!groupId && <div className="text-sm text-muted-foreground">No data available</div>}
        {groupId && (
          <>
            <div className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
              {recap?.content || "No recap yet"}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={regenerate}>Regenerate</Button>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(recap?.content || "")}>Copy</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


