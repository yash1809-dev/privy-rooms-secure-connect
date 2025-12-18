import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Zap, Cloud, Sword, Droplets } from "lucide-react";

interface NeuralBuddyProps {
  status?: 'idle' | 'focusing' | 'excited' | 'greeting';
}

const INSIGHTS = [
  "Shadow step initialized.",
  "The plant thrives under my care.",
  "Target neutralized with precision.",
  "Teleporting through the neural-net.",
  "Silent execution. Perfect form.",
];

export function NeuralBuddy({ status = 'idle' }: NeuralBuddyProps) {
  const [mood, setMood] = useState<'idle' | 'focusing' | 'excited' | 'striking'>(status === 'greeting' ? 'idle' : status as any);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [homePosition, setHomePosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const buddyRef = useRef<HTMLDivElement>(null);

  // Responsive Home Position
  useEffect(() => {
    const updateHome = () => {
      const isMobile = window.innerWidth < 768;
      const newHome = isMobile
        ? { x: window.innerWidth - 80, y: window.innerHeight - 100 }
        : { x: window.innerWidth - 120, y: window.innerHeight - 150 };
      setHomePosition(newHome);
      setPosition(newHome);
    };
    updateHome();
    window.addEventListener('resize', updateHome);
    return () => window.removeEventListener('resize', updateHome);
  }, []);

  // Update mood based on prop
  useEffect(() => {
    if (status === 'focusing') {
      setMood('focusing');
      // Find plant container and move to it
      const plant = document.getElementById('focus-plant-container');
      if (plant) {
        const rect = plant.getBoundingClientRect();
        teleportTo(rect.left + rect.width / 2 + 40, rect.top + rect.height / 2, false, true);
      }
    } else {
      setMood('idle');
      setIsWatering(false);
      teleportTo(homePosition.x, homePosition.y, false);
    }
  }, [status, homePosition]);

  // Ninja Teleport Jutsu Logic
  const teleportTo = useCallback((newX: number, newY: number, shouldStrike = false, startsWatering = false) => {
    setIsTeleporting(true);
    setTimeout(() => {
      setPosition({ x: newX, y: newY });
      if (shouldStrike) setMood('striking');
      if (startsWatering) setIsWatering(true);

      setTimeout(() => {
        setIsTeleporting(false);
        if (shouldStrike) {
          // After strike, travel back home
          setTimeout(() => {
            setMood('idle');
            // teleportTo is called recursively here, but with shouldStrike=false, it stops
            teleportTo(homePosition.x, homePosition.y);
          }, 800);
        }
      }, 300);
    }, 300);
  }, [homePosition]);

  // Global Click Interaction
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteraction = target.closest('button') || target.closest('a') || target.tagName === 'INPUT' || target.closest('[role="button"]');

      if (isInteraction && !buddyRef.current?.contains(target)) {
        const rect = (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target).getBoundingClientRect();
        teleportTo(rect.left - 20, rect.top - 20, true);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [teleportTo]);

  const toggleInsight = () => {
    setCurrentThought(INSIGHTS[Math.floor(Math.random() * INSIGHTS.length)]);
    setTimeout(() => setCurrentThought(null), 3000);
  };

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: position.x, top: position.y, transition: 'all 0.15s cubic-bezier(0.2, 0, 0.2, 1)' }}
    >
      <AnimatePresence>
        {isTeleporting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 2 }}
            exit={{ opacity: 0, scale: 3 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Cloud className="w-16 h-16 text-slate-400/30 blur-md fill-slate-400/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={buddyRef}
        animate={{
          scale: isTeleporting ? 0 : (window.innerWidth < 768 ? 0.7 : 1),
          y: mood === 'idle' ? [0, -5, 0] : 0,
        }}
        transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
        className="relative w-20 h-24 pointer-events-auto cursor-help group"
        onClick={toggleInsight}
      >
        {/* Thought Bubble */}
        <AnimatePresence>
          {currentThought && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -60 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 border border-teal-500/30 px-3 py-1.5 rounded-xl text-[10px] font-mono text-teal-400 shadow-2xl backdrop-blur-md"
            >
              {currentThought}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SWORD ANIMATION */}
        <AnimatePresence>
          {mood === 'striking' && !isTeleporting && (
            <motion.div
              initial={{ opacity: 0, rotate: -45, scale: 0 }}
              animate={{ opacity: 1, rotate: 135, scale: 1.5 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -right-8 top-0 z-20"
            >
              <Sword className="w-10 h-10 text-slate-200 drop-shadow-[0_0_8px_white]" />
              <motion.div
                animate={{ opacity: [0, 1, 0], scaleX: [0, 2, 0] }}
                className="absolute top-4 left-0 w-12 h-0.5 bg-white/80 blur-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* WATERING ANIMATION */}
        <AnimatePresence>
          {isWatering && !isTeleporting && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: -10 }}
              exit={{ opacity: 0 }}
              className="absolute -left-10 top-4 z-20"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-teal-400 animate-bounce" />
                </div>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, 20], opacity: [0, 1, 0], x: [0, -10] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                    className="absolute top-8 right-4 w-1 h-1 bg-teal-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SHINOBI CHARACTER */}
        <div className="relative w-full h-full flex flex-col items-center">
          {/* Head & Mask */}
          <div className="relative w-12 h-12 bg-slate-900 rounded-full border border-white/10 overflow-hidden shadow-2xl">
            {/* Mask */}
            <div className="absolute bottom-0 w-full h-1/2 bg-slate-950 border-t border-white/5" />
            {/* Eyes */}
            <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1">
              <motion.div
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className={cn("w-2 h-0.5 bg-teal-400 shadow-[0_0_5px_teal]", mood === 'striking' && "bg-red-500 shadow-red-500")}
              />
              <motion.div
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ repeat: Infinity, duration: 4, delay: 0.1 }}
                className={cn("w-2 h-0.5 bg-teal-400 shadow-[0_0_5px_teal]", mood === 'striking' && "bg-red-500 shadow-red-500")}
              />
            </div>
            {/* Headband Ties */}
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -right-2 top-2 w-4 h-1 bg-slate-800 rounded-full"
            />
          </div>

          {/* Body */}
          <div className="w-10 h-10 bg-slate-900 rounded-b-2xl border-x border-b border-white/10 mt-[-2px] relative">
            {/* Belt */}
            <div className="absolute top-2 w-full h-2 bg-slate-950 border-y border-white/5">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-teal-500/40" />
            </div>
            {/* Arms */}
            <motion.div
              animate={{ rotate: isWatering ? -30 : 0 }}
              className="absolute -left-2 top-1 w-3 h-6 bg-slate-900 border-l border-white/5 rounded-full"
            />
            <motion.div
              animate={{ rotate: mood === 'striking' ? 90 : 0 }}
              className="absolute -right-2 top-1 w-3 h-6 bg-slate-900 border-r border-white/5 rounded-full"
            />
          </div>

          {/* Scarf / Cape */}
          <motion.div
            animate={{ skewX: [-5, 5, -5], y: [0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute bottom-4 -z-10 w-14 h-16 bg-gradient-to-b from-slate-900 to-transparent rounded-full opacity-60 blur-[2px]"
          />
        </div>

        {/* Aura Glow */}
        <div className={cn(
          "absolute inset-0 -z-20 rounded-full blur-2xl opacity-20 transition-all duration-700",
          mood === 'striking' ? "bg-red-500 scale-150" :
            mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-indigo-500"
        )} />
      </motion.div>
    </div>
  );
}
