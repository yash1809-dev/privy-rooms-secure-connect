
import { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
// Lazy load heavy components for better initial load
const FocusTimer = lazy(() => import("@/components/dashboard/FocusTimer").then(m => ({ default: m.FocusTimer })));
const FocusPlant = lazy(() => import("@/components/dashboard/FocusPlant").then(m => ({ default: m.FocusPlant })));
const VoiceNotesToText = lazy(() => import("@/components/VoiceNotesToText"));
const Timetable = lazy(() => import("@/components/Timetable"));
import { TodoList } from "@/components/dashboard/TodoList";
import { NeuralCouple } from "@/components/dashboard/NeuralCouple";
import { Footer } from "@/components/Footer";
import { CharacterControlMenu } from "@/components/dashboard/CharacterControlMenu";
import {
  Clock, GraduationCap, Mic, MapPin, Lock, Unlock,
  Map as MapIcon, ChevronRight, Zap, MoreVertical, Image as ImageIcon, RotateCcw,
  User, ShieldCheck, Sparkles, Upload, MessageSquare, Pen, CheckSquare,
  Activity, Terminal as TerminalIcon, LayoutDashboard, Settings, Radar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { LogOut, Sun, Moon, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useProfileData } from "@/hooks/useProfileData";
import { useTheme } from "@/components/ThemeProvider";
import { markTodayAsActive, calculateStreak, getXP, addXP, getProgression } from "@/lib/activity";
import { toast } from "sonner";
import { useDailyState } from "@/hooks/useDailyState";
import { useLocalStorage } from "@/hooks/useDebouncedLocalStorage";
import { ZoneSkeleton } from "@/components/skeleton/SkeletonLoaders";

// --- CONSTANTS ---
const SECTIONS = [
  { id: "focus-zone", label: "Focus Sanctuary", icon: Clock, color: "text-teal-400" },
  { id: "academic-zone", label: "Academic Hub", icon: GraduationCap, color: "text-indigo-400" },
  { id: "broadcast-zone", label: "Broadcast Tower", icon: Mic, color: "text-pink-400" },
  { id: "planner-zone", label: "Mission Control", icon: CheckSquare, color: "text-amber-400" },
];

interface UserProfile {
  username?: string | null;
  avatar_url?: string | null;
}

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: profileData } = useProfileData();
  const userProfile = profileData?.me as UserProfile | undefined;
  const { theme, setTheme } = useTheme();

  //  --- OPTIMIZED STATE MANAGEMENT ---
  // Use debounced localStorage hooks to prevent main thread blocking
  const [minutesFocused, setMinutesFocused] = useDailyState("dailyFocusLogs", 0);
  const [todos, setTodos] = useDailyState<TodoTask[]>("dailyTodos", []);

  // Background settings - infrequent changes, no debounce needed
  const [bgImage, setBgImage] = useLocalStorage("dashboardBgImage", "");
  const [bgOpacity, setBgOpacity] = useLocalStorage("dashboardBgOpacity", 0.5);
  const [showOrbs, setShowOrbs] = useLocalStorage("dashboardShowOrbs", true);

  // UI state - doesn't need localStorage
  const [unlockedZones, setUnlockedZones] = useState<string[]>(["focus-zone"]);
  const [activeZone, setActiveZone] = useState("focus-zone");

  // User progression
  const [userXP, setUserXP] = useState(() => getXP());

  // Decorative state - TODO: Move to local components for better performance
  const [buddyStatus, setBuddyStatus] = useState<'idle' | 'focusing' | 'excited' | 'greeting'>('idle');
  const [vocalPrecision, setVocalPrecision] = useState<number>(0);
  const [ninjaPos, setNinjaPos] = useState({ x: 0, y: 0 });
  const [kunoichiPos, setKunoichiPos] = useState({ x: 0, y: 0 });

  // Memoize computed values to avoid recalculation on every render
  const streak = useMemo(() => calculateStreak(), []);
  const dailyProgress = useMemo(() => {
    if (todos.length === 0) return 0;
    return Math.floor((todos.filter(t => t.completed).length / todos.length) * 100);
  }, [todos]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // No more manual localStorage effects - handled by hooks!

  // --- HANDLERS (Optimized with useCallback) ---
  const handleXPUpdate = useCallback((newXP: number) => {
    const oldLevel = getProgression(userXP).level;
    const newLevel = getProgression(newXP).level;

    setUserXP(newXP);

    if (newLevel > oldLevel) {
      setBuddyStatus('excited');
      toast.success("LEVEL UP!", {
        description: `Neural Interface upgraded to Rank ${newLevel}.`,
        icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
        duration: 5000,
      });
    } else {
      setBuddyStatus('excited');
    }
  }, [userXP]);

  const handleSessionComplete = useCallback((minutes: number) => {
    setMinutesFocused((prev: number) => prev + minutes);
    markTodayAsActive();

    const xpGained = minutes * 10;
    const newXP = addXP(xpGained);
    handleXPUpdate(newXP);

    setBuddyStatus('excited');

    toast.success(`Session Complete: +${xpGained} XP Neural Synced`, {
      description: "Neural augmentations optimized.",
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    });
  }, [handleXPUpdate]);

  const handleTaskComplete = useCallback((xpGained: number) => {
    const newXP = addXP(xpGained);
    handleXPUpdate(newXP);
    setBuddyStatus('excited');
    toast.success(`Mission Success: +${xpGained} XP`, {
      description: "Network integration increased.",
      icon: <CheckSquare className="w-4 h-4 text-teal-400" />,
    });
  }, [handleXPUpdate]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setBgImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const teleportTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-foreground overflow-hidden selection:bg-teal-500/30 relative max-w-[100vw]">

      {/* --- LAPTOP SIDEBAR --- */}
      <DashboardSidebar
        userProfile={userProfile}
        dailyProgress={dailyProgress}
        streak={streak}
        activeZone={activeZone}
        teleportTo={teleportTo}
        unlockedZones={unlockedZones}
        navigate={navigate}
        xp={userXP}
      />

      {/* --- MAIN WORLD --- */}
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden scroll-smooth h-full">

        {/* --- BACKGROUND LAYERS --- */}
        {bgImage && (
          <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity: bgOpacity }} />
          </div>
        )}
        {showOrbs && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="glow-orb top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-500/10" style={{ animationDelay: '0s' }} />
            <div className="glow-orb bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10" style={{ animationDelay: '-5s' }} />
            <div className="glow-orb top-[40%] left-[30%] w-[20vw] h-[20vw] bg-pink-500/5" style={{ animationDelay: '-10s' }} />
          </div>
        )}

        {/* --- TOP HUD CONTROLS --- */}
        <input type="file" id="wallpaper-upload" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="fixed top-0 left-0 lg:left-80 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pointer-events-none">
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto cursor-pointer group" onClick={() => navigate('/dashboard')}>
            <div className="relative">
              <div className="absolute -inset-2 bg-teal-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              <img src="/logo.png" alt="CollegeOS" className="h-8 w-8 sm:h-10 sm:w-10 object-contain transition-transform group-hover:scale-110 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
            </div>
            <div className="hidden sm:flex flex-col">
              <h1 className="text-lg sm:text-xl font-black tracking-tighter text-white group-hover:text-teal-400 transition-colors">CollegeOS</h1>
              <span className="text-[8px] font-mono text-teal-500/60 uppercase tracking-[0.3em]">Neural Interface v2.5</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
            <Button
              variant="outline" size="icon" onClick={() => navigate("/chats")}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 backdrop-blur-md border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 transition-all hover:scale-110"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 backdrop-blur-md border-cyan-500/20 hover:bg-white/10 hover:border-cyan-500/40 transition-all hover:scale-110 group">
                  <Radar className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:animate-spin" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 bg-slate-950/95 backdrop-blur-2xl border-cyan-500/20 text-slate-200 shadow-2xl mr-4">
                <CharacterControlMenu
                  ninjaPos={ninjaPos}
                  kunoichiPos={kunoichiPos}
                  currentPage="/dashboard"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 backdrop-blur-md border-white/10 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110">
                  <MoreVertical className="w-5 h-5 text-slate-300" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-slate-950/90 backdrop-blur-2xl border-white/10 text-slate-200 shadow-2xl overflow-hidden mr-4">
                <div className="p-4 space-y-4 bg-white/5 relative group">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={userProfile?.avatar_url || "https://github.com/shadcn.png"} />
                      <AvatarFallback>{userProfile?.username?.substring(0, 2).toUpperCase() || "OS"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white truncate">{userProfile?.username || "Guest Operative"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => navigate("/profile")}>
                      <Pen className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                      <div className="flex items-center gap-2">
                        <span className="text-white">Rank {getProgression(userXP).level}</span>
                        <span className="text-teal-500/80 font-mono">
                          {getProgression(userXP).level < 5 ? "Initiate" : getProgression(userXP).level < 15 ? "Veteran" : getProgression(userXP).level < 30 ? "Elite" : "Master"}
                        </span>
                      </div>
                      <span className="text-teal-400 font-mono">{getProgression(userXP).xpInLevel}/{getProgression(userXP).xpNeededForNextLevel} XP</span>
                    </div>
                    <Progress value={getProgression(userXP).progressToNextLevel} className="h-1.5 bg-slate-800" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/20">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">{streak} Day Streak</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      Sync: <span className="text-indigo-400 font-black">{dailyProgress}%</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Progress value={dailyProgress} className="h-1 bg-slate-800/50" />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="p-4 space-y-4">
                  <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Visual Override
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="wallpaper-upload"
                        className="w-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider h-8 hover:bg-white/10 flex items-center justify-center rounded-md cursor-pointer transition-colors text-white"
                      >
                        <Upload className="w-3 h-3 mr-2 text-teal-400" /> Change Wallpaper
                      </label>
                      <Button
                        variant="ghost" size="sm" onClick={() => setBgImage("")}
                        className="w-full text-[10px] text-slate-400 hover:text-white uppercase tracking-wider h-6"
                      >
                        <RotateCcw className="w-3 h-3 mr-2" /> Reset Default
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Dimming</Label>
                        <span className="text-[10px] font-mono text-teal-400">{Math.round(bgOpacity * 100)}%</span>
                      </div>
                      <Slider
                        min={0} max={0.95} step={0.05} value={[bgOpacity]}
                        onValueChange={([val]) => setBgOpacity(val)}
                        className="[&>[role=slider]]:h-3 [&>[role=slider]]:w-3"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Cyber Orbs</Label>
                      <Switch checked={showOrbs} onCheckedChange={setShowOrbs} className="scale-75 data-[state=checked]:bg-teal-500" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Dark Core</Label>
                      <Switch checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} className="scale-75 data-[state=checked]:bg-indigo-500" />
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-black/40 text-center border-t border-white/5 cursor-pointer hover:bg-red-500/10 transition-colors"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                >
                  <p className="text-[9px] text-red-400 font-mono tracking-widest uppercase flex items-center justify-center gap-2">
                    <LogOut className="w-3 h-3" /> Neural Disconnect
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* --- MOBILE TELEPORTER --- */}
        <div className="fixed right-3 bottom-24 z-40 flex flex-col gap-3 lg:hidden">
          <div className="glass-panel p-1.5 rounded-2xl flex flex-col gap-2 shadow-2xl border-white/10 bg-black/30 backdrop-blur-md">
            {SECTIONS.map((section) => (
              <button
                key={section.id} onClick={() => teleportTo(section.id)}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                  activeZone === section.id ? "bg-white/20 shadow-lg scale-105" : "hover:bg-white/10"
                )}
              >
                <section.icon className={cn("w-5 h-5", section.color)} />
              </button>
            ))}
          </div>
        </div>

        {/* --- MAP CONTENT --- */}
        <div className="relative z-10 w-full pt-16 sm:pt-20 pb-32 sm:pb-48 px-0 lg:pl-0 lg:pr-12 xl:pr-20 overflow-x-hidden">
          <header className="mb-16 sm:mb-24 md:mb-32 text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-12 duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-300 text-[9px] font-mono tracking-[0.2em] uppercase backdrop-blur-sm relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <span className="animate-pulse">Neural Uplink Active</span>
            </div>
            <div className="relative group overflow-hidden max-w-full">
              <div className="absolute -inset-10 bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-pink-500/20 blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity" />
              <h1 className="text-5xl sm:text-7xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-slate-500/50 drop-shadow-2xl relative z-10 filter brightness-125 animate-glitch truncate sm:whitespace-normal">
                CAMPUS
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_infinite] mix-blend-overlay pointer-events-none" />
              </h1>
            </div>
            <p className="hidden lg:block text-slate-200/40 font-medium max-w-lg mx-auto terminal-text lowercase text-xs tracking-tight relative">
              <span className="inline-block animate-pulse mr-2 text-teal-500">●</span>
              integrated college os hub // live rendering enabled // sector scan: 15ms
            </p>
          </header>

          <MapZone id="focus-zone" title="Focus Sanctuary" subtitle="Regeneration Sector" setUnlocked={setUnlockedZones} setActive={setActiveZone} color="teal" icon={Clock}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-9 space-y-8">
                <Card className="glass-card p-6 sm:p-10 border-teal-500/20 bg-slate-900/40 glass-card-hover backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Zap className="w-24 h-24 text-teal-500" />
                  </div>
                  <Suspense fallback={<ZoneSkeleton />}>
                    <FocusTimer
                      onSessionComplete={handleSessionComplete}
                      setMinutesFocused={setMinutesFocused}
                      onStatusChange={(active) => setBuddyStatus(active ? 'focusing' : 'idle')}
                    />
                  </Suspense>
                </Card>
              </div>

              <div id="focus-plant-container" className="lg:col-span-3 flex flex-col items-center justify-center p-8 bg-black/20 rounded-[3rem] border border-white/5 relative group min-h-[500px]">
                <div className="absolute inset-0 bg-teal-500/10 blur-[100px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative z-10 text-center space-y-6">
                  <div className="hidden lg:block space-y-2">
                    <p className="text-[10px] font-mono text-teal-500 tracking-[0.3em] uppercase">Neural Growth Engine</p>
                    <h4 className="text-2xl font-black text-white italic tracking-tighter">SYNAPTIC BOTANY</h4>
                  </div>
                  <Suspense fallback={<div className="h-64 w-64 bg-white/5 rounded-full animate-pulse" />}>
                    <FocusPlant minutesFocused={minutesFocused} />
                  </Suspense>
                  <div className="pt-4">
                    <Badge variant="outline" className="bg-teal-500/10 border-teal-500/20 text-teal-400 font-mono text-[9px] px-4 py-1">
                      HYDRATION: OPTIMAL
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </MapZone>

          <MapPath />

          <MapZone id="academic-zone" title="Academic Hub" subtitle="Intel Data-Lake" setUnlocked={setUnlockedZones} setActive={setActiveZone} color="indigo" icon={GraduationCap}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-12">
                <Card className="glass-card border-indigo-500/20 bg-slate-900/40 glass-card-hover min-h-[600px] overflow-hidden backdrop-blur-xl relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <GraduationCap className="w-64 h-64 text-indigo-500" />
                  </div>
                  <Suspense fallback={<ZoneSkeleton />}>
                    <Timetable />
                  </Suspense>
                </Card>
              </div>
              <div className="hidden lg:block lg:col-span-4 space-y-6 lg:pr-8">
                <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[3rem] space-y-6 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Activity className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-indigo-400 tracking-[0.3em] uppercase">Intelligence Metrics</p>
                    <h4 className="text-xl font-black text-white italic tracking-tighter">DATA SYNTHESIS</h4>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Focus Duration", value: `${minutesFocused}m`, sub: "Active session" },
                      { label: "Neural Rank", value: `LVL ${getProgression(userXP).level}`, sub: getProgression(userXP).level < 15 ? "Veteran" : "Elite" },
                      { label: "Daily Streak", value: `${streak}d`, sub: "Consecutive sync" }
                    ].map((stat, i) => (
                      <div key={i} className="flex justify-between items-end p-4 bg-white/5 rounded-2xl border border-white/5 transition-colors hover:bg-white/10">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-tight">{stat.sub}</p>
                        </div>
                        <div className="text-xl font-black text-white italic tracking-tighter">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </MapZone>

          <MapPath />

          <MapZone id="broadcast-zone" title="Broadcast Tower" subtitle="Signal Relay" setUnlocked={setUnlockedZones} setActive={setActiveZone} color="pink" icon={Mic}>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="xl:col-span-12 flex flex-col gap-8">
                <Card className="glass-card border-pink-500/20 bg-slate-900/40 glass-card-hover min-h-[400px] backdrop-blur-xl overflow-hidden">
                  <div className="p-3 sm:p-6 md:p-8 lg:p-12">
                    <div className="flex items-center gap-3 sm:gap-6 mb-8 lg:mb-12">
                      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.1)]">
                        <Mic className="w-8 h-8 sm:w-12 sm:h-12" />
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">Signal Processor</h3>
                        <p className="text-[10px] lg:text-xs text-slate-500 uppercase font-bold tracking-[0.3em] mt-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" /> Status: Neural Stream Active
                        </p>
                      </div>
                    </div>
                    <Suspense fallback={<ZoneSkeleton />}>
                      <VoiceNotesToText onPrecisionChange={setVocalPrecision} />
                    </Suspense>
                  </div>
                </Card>
              </div>
            </div>
          </MapZone>

          <MapPath />

          <MapZone id="planner-zone" title="Mission Control" subtitle="Daily Operations" setUnlocked={setUnlockedZones} setActive={setActiveZone} color="amber" icon={CheckSquare}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-12">
                <Card className="glass-card border-amber-500/20 bg-slate-900/90 glass-card-hover backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <CheckSquare className="w-48 h-48 text-amber-500" />
                  </div>
                  <div className="p-3 sm:p-6 md:p-10 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-6 mb-8 lg:mb-12">
                      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-transform group-hover:scale-105">
                        <CheckSquare className="w-8 h-8 sm:w-12 sm:h-12" />
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">Operation Grid</h3>
                        <p className="text-[10px] lg:text-xs text-slate-400 uppercase font-bold tracking-[0.3em] mt-2">Primary Objectives Matrix</p>
                      </div>
                    </div>
                    <TodoList todos={todos} setTodos={setTodos} onTaskComplete={handleTaskComplete} />
                  </div>
                </Card>
              </div>

              <div className="hidden lg:block lg:col-span-5 space-y-8 lg:pr-8">
                <div className="p-10 rounded-[3rem] bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border border-amber-500/10 space-y-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-amber-500 tracking-[0.3em] uppercase text-right">Mission Overview</p>
                    <h4 className="text-3xl font-black text-white italic tracking-tighter text-right leading-none">OBJECTIVE<br />SUMMARY</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completion Rate</span>
                        <Activity className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-4xl font-black text-white italic tracking-tighter">
                        {todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0}%
                      </div>
                      <Progress value={todos.length > 0 ? (todos.filter(t => t.completed).length / todos.length) * 100 : 0} className="h-1 bg-white/5" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase">Successful</p>
                        <p className="text-2xl font-black text-white">{todos.filter(t => t.completed).length}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase">Active</p>
                        <p className="text-2xl font-black text-amber-400">{todos.filter(t => !t.completed).length}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </MapZone>

          <Footer className="border-t border-white/5 bg-transparent mt-10 opacity-60 hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <NeuralCouple
        status={buddyStatus}
        onPositionChange={(n, k) => {
          setNinjaPos(n);
          setKunoichiPos(k);
        }}
      />
    </div>
  );
}

// --- SUB COMPONENTS ---

function DashboardSidebar({ userProfile, dailyProgress, streak, activeZone, teleportTo, unlockedZones, navigate, xp }: any) {
  const { level, xpInLevel, xpNeededForNextLevel, progressToNextLevel } = getProgression(xp || 0);

  return (
    <aside className="hidden lg:flex w-80 hud-sidebar flex-col z-50">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto scrollbar-hide relative z-10">
        {/* Profile Card */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-indigo-500 rounded-2xl blur-lg opacity-10 group-hover:opacity-30 transition duration-1000" />
          <div className="relative p-5 bg-slate-900/40 rounded-2xl border border-white/5 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-teal-500/20 shadow-xl">
                  <AvatarImage src={userProfile?.avatar_url || "https://github.com/shadcn.png"} />
                  <AvatarFallback>{userProfile?.username?.substring(0, 2).toUpperCase() || "OS"}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-teal-500 border-2 border-slate-950 rounded-full shadow-[0_0_10px_teal] flex items-center justify-center">
                  <span className="text-[7px] text-white font-black">{level}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate leading-tight uppercase tracking-tight">{userProfile?.username || "Operative"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[9px] text-teal-400 font-mono tracking-widest uppercase">Level {level}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <p className="text-[9px] text-indigo-400 font-mono tracking-widest uppercase">
                    {level < 5 ? "Initiate" : level < 15 ? "Veteran" : level < 30 ? "Elite" : "Master"}
                  </p>
                </div>
              </div>
            </div>

            {/* XP Progression Bar */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[2px]">
                <span className="text-slate-500">Neural Sync Progress</span>
                <span className="text-teal-400">{Math.floor(progressToNextLevel)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                  style={{ width: `${progressToNextLevel}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>
              <div className="flex justify-between text-[7px] font-mono text-slate-600 tracking-wider">
                <span>{xpInLevel} XP</span>
                <span>{xpNeededForNextLevel} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Grid */}
        <nav className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-3 h-3" /> Navigation Hub
          </p>
          {SECTIONS.map((section) => {
            const isActive = activeZone === section.id;
            const isUnlocked = unlockedZones.includes(section.id);
            return (
              <button
                key={section.id} onClick={() => teleportTo(section.id)}
                className={cn(
                  "w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 group relative overflow-hidden",
                  isActive ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className={cn("p-2 rounded-lg bg-black/40 shadow-inner", isActive && "text-white")}>
                  <section.icon className={cn("w-4 h-4", !isActive && section.color)} />
                </div>
                <span className={cn("text-[11px] font-black transition-all tracking-tight", isActive ? "text-white" : "text-slate-400")}>
                  {section.label}
                </span>
                {isActive && <div className="absolute right-4 w-1 h-1 bg-teal-500 rounded-full shadow-[0_0_10px_#14b8a6]" />}
              </button>
            );
          })}
        </nav>

        {/* HUD Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-0.5 group hover:border-amber-500/30 transition-colors">
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Streak</p>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-base font-black text-white">{streak}</span>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-0.5 group hover:border-teal-500/30 transition-colors">
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Progress</p>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              <span className="text-base font-black text-white">{dailyProgress}%</span>
            </div>
          </div>
        </div>

        {/* Neural Calendar */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
              <CalendarIcon className="w-3 h-3" /> Mission Calendar
            </p>
            <span className="text-[8px] font-mono text-teal-900 uppercase">Live_Sync</span>
          </div>
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 backdrop-blur-2xl shadow-inner scrollbar-hide">
            <MiniCalendar />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 flex gap-3">
        <Button
          variant="ghost" className="flex-1 text-[10px] uppercase font-black tracking-widest hover:bg-white/5 h-10 rounded-xl"
          onClick={() => navigate("/chats")}
        >
          <MessageSquare className="w-4 h-4 mr-2 text-indigo-400" /> Dispatch
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/5 rounded-xl" onClick={() => navigate("/profile")}>
          <Settings className="w-4 h-4 text-slate-500" />
        </Button>
      </div>
    </aside>
  );
}

function MapPath() {
  return (
    <div className="flex justify-center py-24 opacity-10 relative">
      <div className="data-line left-1/2 -translate-x-1/2 top-0" style={{ animationDelay: '0s' }} />
      <div className="data-line left-1/2 -translate-x-1/2 top-1/2" style={{ animationDelay: '1.5s' }} />
      <div className="h-40 w-px bg-gradient-to-b from-transparent via-teal-500 to-transparent" />
    </div>
  );
}

const MapZone = memo(function MapZone({ id, title, subtitle, children, setUnlocked, setActive, color, icon: Icon }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Memoize the observer callback to prevent unnecessary effect re-runs
  const handleIntersection = useCallback(([entry]: IntersectionObserverEntry[]) => {
    if (entry.isIntersecting) {
      setIsVisible(true);
      setUnlocked((prev: string[]) => prev.includes(id) ? prev : [...prev, id]);
      setActive(id);
    }
  }, [id, setUnlocked, setActive]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [handleIntersection]);

  // Uniform glassmorphism - no color-specific shades
  const textColors: any = { teal: "text-teal-400", indigo: "text-indigo-400", pink: "text-pink-400", amber: "text-amber-400" };

  return (
    <section
      id={id} ref={ref}
      className={cn(
        "min-h-[85vh] w-full flex flex-col justify-center transition-all duration-500 ease-out p-5 sm:p-10 md:p-16 lg:px-0 lg:py-24 lg:pl-0.5 rounded-[2rem] sm:rounded-[4rem] border border-white/5 mb-12 sm:mb-40 relative group overflow-hidden backdrop-blur-[2px]",
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-40 scale-95"
      )}
    >
      {/* Uniform glassmorphism effect on hover - no colored gradients */}
      <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 border border-white/10" />

      <div className="mb-10 sm:mb-20 flex items-center gap-4 sm:gap-10 relative z-10">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-2xl transition-all group-hover:scale-110 group-hover:border-white/20 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] duration-500">
          <Icon className="text-white w-7 h-7 sm:w-10 sm:h-10 drop-shadow-lg" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-8 group-hover:transform group-hover:translate-x-2 transition-transform duration-500">
            <div>
              <h2 className={cn("text-xl sm:text-2xl md:text-5xl font-black italic tracking-tighter uppercase relative z-10", isVisible ? "text-white" : "text-white/30")}>
                {title}
              </h2>
            </div>
          </div>
          {!isVisible && <Lock className="w-8 h-8 text-slate-700 animate-pulse" />}
          <p className={cn("font-mono text-sm tracking-[0.4em] uppercase mt-2 opacity-80", textColors[color])}>{subtitle}</p>
        </div>
      </div>

      <div className={cn("transition-all duration-1000 delay-500 relative z-10", isVisible ? "opacity-100 blur-0 translate-y-0" : "opacity-0 blur-2xl translate-y-10")}>
        {children}
      </div>
    </section>
  );
});

function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const start = startOfWeek(startOfMonth(currentMonth));
  const end = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start, end });
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <span className="text-[10px] font-black text-white uppercase tracking-widest">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <ChevronLeft className="w-3 h-3 text-slate-400" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-[8px] font-bold text-slate-600 text-center">{d}</div>
        ))}
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "aspect-square flex items-center justify-center text-[9px] rounded-lg transition-all",
                !isCurrentMonth && "text-slate-800 opacity-20",
                isCurrentMonth && "text-slate-400",
                isToday && "bg-teal-500/20 text-teal-400 font-bold border border-teal-500/20 shadow-[0_0_10px_rgba(20,184,166,0.2)]"
              )}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
