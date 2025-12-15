import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, Trash2 } from "lucide-react";

interface Lecture {
  id?: string;
  day: string;
  time: string; // Stored as "HH:MM-HH:MM" format
  subject: string;
  instructor?: string;
  location?: string;
}

interface LectureFormData {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  instructor?: string;
  location?: string;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Timetable() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [formData, setFormData] = useState<LectureFormData>({
    day: "Monday",
    startTime: "",
    endTime: "",
    subject: "",
    instructor: "",
    location: "",
  });

  useEffect(() => {
    loadLectures();
  }, []);

  const loadLectures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("timetable_lectures")
        .select("*")
        .eq("user_id", user.id)
        .order("day", { ascending: true })
        .order("time", { ascending: true });
      if (error) {
        console.error("Error loading lectures:", error);
        if (error.code === '42P01' || error.message?.includes('timetable_lectures') || error.message?.includes('schema cache')) {
          // Table doesn't exist - silently fail, user will see error when trying to add
          setLectures([]);
          return;
        }
        throw error;
      }
      setLectures(data || []);
    } catch (e: any) {
      console.error("Error loading lectures:", e);
      setLectures([]);
    }
  };

  const saveLecture = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to add lectures");
        return;
      }
      if (!formData.startTime || !formData.endTime || !formData.subject || !formData.day) {
        toast.error("Please fill in day, start time, end time, and subject");
        return;
      }

      // Combine start and end time into "HH:MM-HH:MM" format
      const timeRange = `${formData.startTime}-${formData.endTime}`;

      const lectureData = {
        user_id: user.id,
        day: formData.day,
        time: timeRange,
        subject: formData.subject.trim(),
        instructor: formData.instructor?.trim() || null,
        location: formData.location?.trim() || null,
      };

      if (editingLecture?.id) {
        const { error } = await supabase
          .from("timetable_lectures")
          .update(lectureData)
          .eq("id", editingLecture.id)
          .eq("user_id", user.id);
        if (error) {
          console.error("Update error:", error);
          if (error.code === '42P01' || error.message?.includes('timetable_lectures') || error.message?.includes('schema cache')) {
            toast.error("Timetable table not found. Please run migrations: npm run db:push", {
              duration: 5000,
            });
          } else {
            throw error;
          }
          return;
        }
        toast.success("Lecture updated");
      } else {
        const { error } = await supabase
          .from("timetable_lectures")
          .insert(lectureData);
        if (error) {
          console.error("Insert error:", error);
          if (error.code === '42P01' || error.message?.includes('timetable_lectures') || error.message?.includes('schema cache')) {
            toast.error("Timetable table not found. Please run migrations: npm run db:push", {
              duration: 5000,
            });
          } else {
            throw error;
          }
          return;
        }
        toast.success("Lecture added");
      }
      setDialogOpen(false);
      setEditingLecture(null);
      setFormData({ day: "Monday", startTime: "", endTime: "", subject: "", instructor: "", location: "" });
      await loadLectures();
    } catch (e: any) {
      console.error("Save lecture error:", e);
      toast.error("Failed to save lecture: " + (e.message || "Unknown error"));
    }
  };

  const deleteLecture = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("timetable_lectures")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Lecture deleted");
      await loadLectures();
    } catch (e: any) {
      toast.error("Failed to delete lecture");
    }
  };

  const openEditDialog = (lecture: Lecture) => {
    setEditingLecture(lecture);
    // Parse time from "HH:MM-HH:MM" format back to startTime and endTime
    const [startTime = "", endTime = ""] = lecture.time.split("-");
    setFormData({
      day: lecture.day,
      startTime: startTime,
      endTime: endTime,
      subject: lecture.subject,
      instructor: lecture.instructor || "",
      location: lecture.location || "",
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingLecture(null);
    setFormData({ day: "Monday", startTime: "", endTime: "", subject: "", instructor: "", location: "" });
    setDialogOpen(true);
  };

  // Get current day for default tab
  const getCurrentDay = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayIndex = today === 0 ? 6 : today - 1; // Convert to our 0-indexed Monday-start week
    return WEEKDAYS[dayIndex] || "Monday";
  };

  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  const getLecturesForDay = (day: string) => {
    return lectures.filter((l) => l.day === day).sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl sm:text-2xl">Timetable</CardTitle>
            <CardDescription>Schedule your lectures and classes</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNewDialog} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Lecture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLecture ? "Edit Lecture" : "Add New Lecture"}</DialogTitle>
                <DialogDescription>Schedule a lecture for your timetable</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <select
                    id="day"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Mathematics"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor (optional)</Label>
                  <Input
                    id="instructor"
                    placeholder="Dr. Smith"
                    value={formData.instructor || ""}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    placeholder="Room 101"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <Button onClick={saveLecture} className="w-full">
                  {editingLecture ? "Update Lecture" : "Add Lecture"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Unified View: Horizontal Day Tabs for Both Mobile & Desktop */}
        <div>
          {/* Day Tabs - Horizontal Scrollable */}
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-3 mb-4 border-b scrollbar-hide">
            {WEEKDAYS.map((day) => {
              const dayLectures = getLecturesForDay(day);
              const isSelected = selectedDay === day;
              const isToday = day === getCurrentDay();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-accent text-accent-foreground border"
                      : "hover:bg-accent/50"
                    }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                    {dayLectures.length > 0 && (
                      <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {dayLectures.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day's Lectures - Compact Timeline View */}
          <div className="space-y-2 lg:space-y-3">
            {getLecturesForDay(selectedDay).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No lectures scheduled for {selectedDay}</p>
              </div>
            ) : (
              getLecturesForDay(selectedDay).map((lecture, index) => (
                <div
                  key={lecture.id}
                  className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 bg-card border rounded-lg hover:shadow-sm transition-all active:scale-[0.98]"
                  onClick={() => openEditDialog(lecture)}
                >
                  {/* Time Column */}
                  <div className="flex flex-col items-center justify-center min-w-[60px] lg:min-w-[70px] pt-1">
                    <div className="text-xs lg:text-sm font-bold text-primary">
                      {lecture.time.split('-')[0] || lecture.time}
                    </div>
                    <div className="text-[10px] lg:text-xs text-muted-foreground">
                      {lecture.time.split('-')[1] || ''}
                    </div>
                  </div>

                  {/* Vertical Line */}
                  <div className="flex flex-col items-center pt-2">
                    <div className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                    {index < getLecturesForDay(selectedDay).length - 1 && (
                      <div className="w-[2px] h-full bg-border mt-1" />
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="font-semibold text-sm lg:text-base mb-1 line-clamp-1">{lecture.subject}</div>
                    <div className="flex flex-col gap-1 lg:gap-1.5">
                      {lecture.instructor && (
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-muted-foreground">
                          <span className="text-[10px] lg:text-xs">👨‍🏫</span>
                          <span className="line-clamp-1">{lecture.instructor}</span>
                        </div>
                      )}
                      {lecture.location && (
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-muted-foreground">
                          <span className="text-[10px] lg:text-xs">📍</span>
                          <span className="line-clamp-1">{lecture.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 lg:h-8 lg:w-8 flex-shrink-0 text-destructive/80 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lecture.id) deleteLecture(lecture.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
