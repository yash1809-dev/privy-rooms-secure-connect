import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Timetable from "@/components/Timetable";
import VoiceNotesToText from "@/components/VoiceNotesToText";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useDashboardData } from "@/hooks/useDashboardData";

interface OutletContext {
  selectedRecordingDate?: Date;
}

interface DashboardProps {
  onNavigate?: (tab: "dashboard" | "chats" | "profile") => void;
}

export default function Dashboard({ onNavigate }: DashboardProps = {}) {
  const navigate = useNavigate();
  const { selectedRecordingDate } = useOutletContext<OutletContext>() || {};
  const { data, isLoading, error } = useDashboardData();
  const queryClient = useQueryClient();

  // Prefetch Chats and Profile data when Dashboard mounts
  useEffect(() => {
    // Only prefetch if we're in the tab-based navigation (onNavigate prop exists)
    if (onNavigate) {
      queryClient.prefetchQuery({ queryKey: ['chats'] });
      queryClient.prefetchQuery({ queryKey: ['profile'] });
    }
  }, [queryClient, onNavigate]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load profile");
      if ((error as any).message === "Not authenticated") {
        navigate("/login");
      }
    }
  }, [error, navigate]);

  // Only show skeleton if loading AND no cached data
  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">Your Workspace</h2>

        {/* Timetable */}
        <Timetable />

        {/* Voice Notes to Text */}
        <VoiceNotesToText selectedDate={selectedRecordingDate} />
      </div>
    </div>
  );
}
