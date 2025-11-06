import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MoodKey = "studying" | "chilling" | "brainstorming" | "meeting" | "offline";

export interface RoomStatusMoodProps {
  value: MoodKey;
  onChange: (mood: MoodKey) => void;
  compact?: boolean;
}

const moodIcon: Record<MoodKey, string> = {
  studying: "🎓",
  chilling: "🍿",
  brainstorming: "💡",
  meeting: "🗣️",
  offline: "🌙",
};

export const RoomMoodBadge = ({ mood }: { mood: MoodKey }) => {
  const label = useMemo(() => mood.charAt(0).toUpperCase() + mood.slice(1), [mood]);
  return (
    <Badge variant="outline" className="gap-1">
      <span>{moodIcon[mood]}</span>
      {label}
    </Badge>
  );
};

export default function RoomStatusMood({ value, onChange, compact }: RoomStatusMoodProps) {
  const moods: MoodKey[] = ["studying", "chilling", "brainstorming", "meeting", "offline"];
  return (
    <div className={compact ? "flex gap-2 items-center" : "space-y-3"}>
      {!compact && <div className="text-sm text-muted-foreground">Room Status</div>}
      <div className="flex flex-wrap gap-2">
        {moods.map((m) => (
          <Button
            key={m}
            variant={m === value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(m)}
            className="gap-2"
          >
            <span>{moodIcon[m]}</span>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}


