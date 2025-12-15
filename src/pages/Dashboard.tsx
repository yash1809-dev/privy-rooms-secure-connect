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

  // Safely get outlet context with fallback
  let outletContext: OutletContext | undefined;
  try {
    outletContext = useOutletContext<OutletContext>();
  } catch (e) {
    console.log('No outlet context available, using defaults');
    outletContext = undefined;
  }

  const { selectedRecordingDate } = outletContext || {};
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
      console.error('[Dashboard] Error:', error);
      toast.error("Failed to load dashboard");
      if ((error as any).message === "Not authenticated") {
        console.log('[Dashboard] Not authenticated, redirecting to login');
        navigate("/login");
      }
    }
  }, [error, navigate]);

  // Log loading state
  useEffect(() => {
    console.log('[Dashboard] Loading:', isLoading, 'Has Data:', !!data);
  }, [isLoading, data]);

  // Only show skeleton if loading AND no cached data
  if (isLoading && !data) {
    console.log('[Dashboard] Showing skeleton');
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    console.log('[Dashboard] Showing error state');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading your dashboard. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  console.log('[Dashboard] Rendering dashboard content');

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
