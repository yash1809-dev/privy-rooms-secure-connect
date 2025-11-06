import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ThemeKey = "default" | "focus" | "chill" | "sunset" | "neon";

export interface RoomThemeSelectorProps {
  value: ThemeKey;
  onChange: (theme: ThemeKey) => void;
  compact?: boolean;
}

const themePreview: Record<ThemeKey, string> = {
  default: "bg-gradient-to-r from-muted to-background",
  focus: "bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20",
  chill: "bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-cyan-500/20",
  sunset: "bg-gradient-to-r from-rose-500/20 via-orange-500/20 to-amber-500/20",
  neon: "bg-gradient-to-r from-fuchsia-500/20 via-cyan-500/20 to-lime-500/20",
};

export const RoomThemeBadge = ({ theme }: { theme: ThemeKey }) => {
  const label = useMemo(() => theme.charAt(0).toUpperCase() + theme.slice(1), [theme]);
  return (
    <Badge variant="secondary" className="gap-2">
      <span className={`h-3 w-6 rounded ${themePreview[theme]}`}></span>
      {label}
    </Badge>
  );
};

export default function RoomThemeSelector({ value, onChange, compact }: RoomThemeSelectorProps) {
  const themes: ThemeKey[] = ["default", "focus", "chill", "sunset", "neon"];
  return (
    <div className={compact ? "flex gap-2 items-center" : "space-y-3"}>
      {!compact && <div className="text-sm text-muted-foreground">Room Theme</div>}
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <Button
            key={t}
            variant={t === value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(t)}
            className="gap-2"
          >
            <span className={`h-3 w-6 rounded ${themePreview[t]}`}></span>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export type { ThemeKey };


