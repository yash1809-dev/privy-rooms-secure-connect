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
  time: string;
  subject: string;
  instructor?: string;
  location?: string;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Timetable() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [formData, setFormData] = useState<Lecture>({
    day: "Monday",
    time: "",
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
      if (error) throw error;
      setLectures(data || []);
    } catch (e: any) {
      console.error("Error loading lectures:", e);
    }
  };

  const saveLecture = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !formData.time || !formData.subject) {
        toast.error("Please fill in time and subject");
        return;
      }
      if (editingLecture?.id) {
        const { error } = await supabase
          .from("timetable_lectures")
          .update({ ...formData })
          .eq("id", editingLecture.id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Lecture updated");
      } else {
        const { error } = await supabase
          .from("timetable_lectures")
          .insert({ ...formData, user_id: user.id });
        if (error) throw error;
        toast.success("Lecture added");
      }
      setDialogOpen(false);
      setEditingLecture(null);
      setFormData({ day: "Monday", time: "", subject: "", instructor: "", location: "" });
      await loadLectures();
    } catch (e: any) {
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
    setFormData(lecture);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingLecture(null);
    setFormData({ day: "Monday", time: "", subject: "", instructor: "", location: "" });
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
                <div className="space-y-2">
                  <Label htmlFor="time">Time (e.g., 09:00)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
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
                  <div className="space-y-2">
                    {dayLectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="p-3 bg-accent/50 rounded border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => openEditDialog(lecture)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">{lecture.time}</span>
                            </div>
                            <div className="font-semibold text-base">{lecture.subject}</div>
                            {lecture.instructor && (
                              <div className="text-sm text-muted-foreground mt-1">Instructor: {lecture.instructor}</div>
                            )}
                            {lecture.location && (
                              <div className="text-sm text-muted-foreground">Location: {lecture.location}</div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (lecture.id) deleteLecture(lecture.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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

