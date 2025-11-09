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

  const getLecturesForDay = (day: string) => {
    return lectures.filter((l) => l.day === day).sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Timetable</CardTitle>
            <CardDescription>Schedule your lectures and classes</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNewDialog}>
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
        <div className="space-y-6">
          {WEEKDAYS.map((day) => {
            const dayLectures = getLecturesForDay(day);
            return (
              <div key={day} className="border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 pb-2 border-b">{day}</h3>
                {dayLectures.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">No lectures scheduled</div>
                ) : (
                  <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
                    {dayLectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="p-3 bg-accent/50 rounded border cursor-pointer hover:bg-accent transition-colors min-w-[200px] flex-shrink-0"
                        onClick={() => openEditDialog(lecture)}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {lecture.time.includes("-") ? lecture.time : `${lecture.time}-`}
                            </span>
                          </div>
                          <div className="font-semibold text-sm">{lecture.subject}</div>
                          {lecture.instructor && (
                            <div className="text-xs text-muted-foreground">Instructor: {lecture.instructor}</div>
                          )}
                          {lecture.location && (
                            <div className="text-xs text-muted-foreground">Location: {lecture.location}</div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 self-end mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (lecture.id) deleteLecture(lecture.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

