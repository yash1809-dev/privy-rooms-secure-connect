import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RecordingsCalendarProps {
  onDateSelect: (date: Date | undefined) => void;
  selectedDate?: Date;
}

export function RecordingsCalendar({ onDateSelect, selectedDate }: RecordingsCalendarProps) {
  const [open, setOpen] = useState(false);
  const [datesWithRecordings, setDatesWithRecordings] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecordingDates();
  }, []);

  const loadRecordingDates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all unique dates where user has recordings
      const { data, error } = await supabase
        .from("voice_recordings")
        .select("recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false });

      if (error) throw error;

      // Extract unique dates (day level)
      const uniqueDates = new Set<string>();
      const dates: Date[] = [];
      
      data?.forEach((record) => {
        const dateStr = format(new Date(record.recorded_at), "yyyy-MM-dd");
        if (!uniqueDates.has(dateStr)) {
          uniqueDates.add(dateStr);
          dates.push(startOfDay(new Date(record.recorded_at)));
        }
      });

      setDatesWithRecordings(dates);
    } catch (error) {
      console.error("Failed to load recording dates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onDateSelect(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            selectedDate && "text-primary"
          )}
          title="View recordings by date"
        >
          <CalendarIcon className="h-5 w-5" />
          {datesWithRecordings.length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => date > new Date()}
          modifiers={{
            hasRecordings: datesWithRecordings,
          }}
          modifiersClassNames={{
            hasRecordings: "bg-primary/10 font-bold border border-primary/20 rounded-md",
          }}
          initialFocus
        />
        {loading && (
          <div className="text-xs text-muted-foreground text-center pb-2">
            Loading dates...
          </div>
        )}
        {!loading && datesWithRecordings.length === 0 && (
          <div className="text-xs text-muted-foreground text-center pb-2">
            No recordings yet
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
