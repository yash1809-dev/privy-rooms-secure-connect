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
  "Patrolling the neural-net.",
  "Silent execution. Perfect form.",
  "Training never stops.",
  "Observing user patterns...",
];

const ANGRY_INSIGHTS = [
  "Hey! I was watering that!",
  "Where did the plant go?!",
  "Don't scroll while I'm working!",
  "You made me lose focus!",
];

export function NeuralBuddy({ status = 'idle' }: NeuralBuddyProps) {
  const [mood, setMood] = useState<'idle' | 'focusing' | 'excited' | 'striking' | 'angry' | 'walking'>('idle');
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [homePosition, setHomePosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [isPlantVisible, setIsPlantVisible] = useState(true);
  const buddyRef = useRef<HTMLDivElement>(null);
  const wasWateringRef = useRef(false);

  // Responsive Home Position
  useEffect(() => {
    const updateHome = () => {
      const isMobile = window.innerWidth < 768;
      const newHome = isMobile
        ? { x: window.innerWidth - 80, y: window.innerHeight - 100 }
        : { x: window.innerWidth - 120, y: window.innerHeight - 150 };
      setHomePosition(newHome);
      if (mood === 'idle') setPosition(newHome);
    };
    updateHome();
    window.addEventListener('resize', updateHome);
    return () => window.removeEventListener('resize', updateHome);
  }, [mood]);

  // INTELLIGENT PLANT VISIBILITY DETECTION
  useEffect(() => {
    const plantObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasVisible = isPlantVisible;
          const nowVisible = entry.isIntersecting;
          setIsPlantVisible(nowVisible);

          // GET ANGRY IF PLANT DISAPPEARS WHILE WATERING
          if (wasVisible && !nowVisible && wasWateringRef.current) {
            setMood('angry');
            setCurrentThought(ANGRY_INSIGHTS[Math.floor(Math.random() * ANGRY_INSIGHTS.length)]);
            setIsWatering(false);

            // Cool down after 3 seconds
            setTimeout(() => {
              setMood('idle');
              setCurrentThought(null);
            }, 3000);
          }
        });
      },
      { threshold: 0.3 }
    );

    const plantElement = document.getElementById('focus-plant-container');
    if (plantElement) {
      plantObserver.observe(plantElement);
    }

    return () => plantObserver.disconnect();
  }, [isPlantVisible]);

  // Track watering state
  useEffect(() => {
    wasWateringRef.current = isWatering;
  }, [isWatering]);

  // Update mood based on prop with plant awareness
  useEffect(() => {
    if (status === 'focusing') {
      const plant = document.getElementById('focus-plant-container');
      if (plant && isPlantVisible) {
        setMood('focusing');
        const rect = plant.getBoundingClientRect();
        walkTo(rect.left + rect.width / 2 + 40, rect.top + rect.height / 2, true);
      } else if (!isPlantVisible) {
        // User is trying to focus but plant not visible - get confused
        setMood('angry');
        setCurrentThought("Where's the plant?!");
      }
    } else if (status === 'excited') {
      setMood('excited');
      setTimeout(() => setMood('idle'), 2000);
    } else {
      setMood('idle');
      setIsWatering(false);
      walkTo(homePosition.x, homePosition.y);
    }
  }, [status, homePosition, isPlantVisible]);

  // SMOOTH WALKING (no teleport during roaming)
  const walkTo = useCallback((newX: number, newY: number, startWatering = false) => {
    setMood('walking');
    setPosition({ x: newX, y: newY });

    setTimeout(() => {
      if (startWatering) {
        setIsWatering(true);
        setMood('focusing');
      } else {
        setMood('idle');
      }
    }, 800);
  }, []);

  // TELEPORT (only for button strikes)
  const teleportTo = useCallback((newX: number, newY: number, shouldStrike = false) => {
    setIsTeleporting(true);
    setTimeout(() => {
      setPosition({ x: newX, y: newY });
      if (shouldStrike) setMood('striking');

      setTimeout(() => {
        setIsTeleporting(false);
        if (shouldStrike) {
          setTimeout(() => {
            setMood('idle');
            // Return home with walking, not teleport
            walkTo(homePosition.x, homePosition.y);
          }, 800);
        }
      }, 300);
    }, 300);
  }, [homePosition, walkTo]);

  // Global Click Interaction - TELEPORT for urgency
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

  // Autonomous Roaming with WALKING (not teleport)
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'walking') return;

    const roam = () => {
      if (mood === 'angry' || mood === 'striking') return; // Don't interrupt

      const margin = 100;
      const randomX = margin + Math.random() * (window.innerWidth - margin * 2);
      const randomY = margin + Math.random() * (window.innerHeight - margin * 2);

      walkTo(randomX, randomY); // WALK, don't teleport

      if (Math.random() > 0.7) {
        setTimeout(() => toggleInsight(), 1000);
      }
    };

    const interval = setInterval(roam, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, [mood, walkTo]);

  // SMART SPEECH BUBBLE POSITIONING
  const getBubblePosition = () => {
    const screenWidth = window.innerWidth;
    const ninjaX = position.x;

    // If too far right, position bubble to the left
    if (ninjaX > screenWidth - 200) {
      return { left: 'auto', right: '100%', marginRight: '10px', whiteSpace: 'nowrap' as const };
    }
    // If too far left, position to the right
    if (ninjaX < 200) {
      return { left: '100%', right: 'auto', marginLeft: '10px', whiteSpace: 'nowrap' as const };
    }
    // Default: above
    return { left: '50%', transform: 'translateX(-50%)', top: '-70px', whiteSpace: 'nowrap' as const };
  };

  return (
    <div
      className="fixed z-[9999] pointer-events-none transition-all duration-700 ease-out"
      style={{ left: position.x, top: position.y }}
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
          y: mood === 'idle' || mood === 'walking' ? [0, -5, 0] : 0,
        }}
        transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
        className="relative w-20 h-24 pointer-events-auto cursor-help group"
        onClick={toggleInsight}
      >
        {/* Smart Thought Bubble */}
        <AnimatePresence>
          {currentThought && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none whitespace-nowrap"
              style={getBubblePosition()}
            >
              <div className={cn(
                "relative px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-2",
                mood === 'angry' ? "bg-red-100 border-red-600" : "bg-white border-slate-900"
              )}>
                <p className={cn(
                  "text-[11px] font-bold",
                  mood === 'angry' ? "text-red-900" : "text-slate-900"
                )}>{currentThought}</p>
                {/* Speech bubble tail - adjust based on position */}
                {position.x <= window.innerWidth - 200 && position.x >= 200 && (
                  <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 border-r-2 border-b-2 rotate-45",
                    mood === 'angry' ? "bg-red-100 border-red-600" : "bg-white border-slate-900"
                  )} />
                )}
              </div>
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
            <div className="absolute bottom-0 w-full h-1/2 bg-slate-950 border-t border-white/5" />
            {/* Eyes - change color when angry */}
            <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between px-1">
              <motion.div
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className={cn(
                  "w-2 h-0.5",
                  mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                    mood === 'striking' ? "bg-red-500 shadow-red-500" :
                      "bg-teal-400 shadow-[0_0_5px_teal]"
                )}
              />
              <motion.div
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ repeat: Infinity, duration: 4, delay: 0.1 }}
                className={cn(
                  "w-2 h-0.5",
                  mood === 'angry' ? "bg-red-500 shadow-[0_0_5px_red]" :
                    mood === 'striking' ? "bg-red-500 shadow-red-500" :
                      "bg-teal-400 shadow-[0_0_5px_teal]"
                )}
              />
            </div>
            {/* Headband with angry expression */}
            <motion.div
              animate={{ rotate: mood === 'angry' ? [-10, 10, -10] : [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: mood === 'angry' ? 0.5 : 2 }}
              className="absolute -right-2 top-2 w-4 h-1 bg-slate-800 rounded-full"
            />
          </div>

          {/* Body */}
          <div className="w-10 h-10 bg-slate-900 rounded-b-2xl border-x border-b border-white/10 mt-[-2px] relative">
            <div className="absolute top-2 w-full h-2 bg-slate-950 border-y border-white/5">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-teal-500/40" />
            </div>
            {/* Arms - animated based on activity */}
            <motion.div
              animate={{ rotate: isWatering ? -30 : mood === 'walking' ? [-10, 10, -10] : 0 }}
              transition={{ repeat: mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
              className="absolute -left-2 top-1 w-3 h-6 bg-slate-900 border-l border-white/5 rounded-full"
            />
            <motion.div
              animate={{ rotate: mood === 'striking' ? 90 : mood === 'walking' ? [10, -10, 10] : 0 }}
              transition={{ repeat: mood === 'walking' ? Infinity : undefined, duration: 0.8 }}
              className="absolute -right-2 top-1 w-3 h-6 bg-slate-900 border-r border-white/5 rounded-full"
            />
          </div>

          {/* Scarf / Cape with walking animation */}
          <motion.div
            animate={{
              skewX: mood === 'walking' ? [-10, 10, -10] : [-5, 5, -5],
              y: [0, 2, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: mood === 'walking' ? 0.6 : 4
            }}
            className="absolute bottom-4 -z-10 w-14 h-16 bg-gradient-to-b from-slate-900 to-transparent rounded-full opacity-60 blur-[2px]"
          />
        </div>

        {/* Aura Glow - changes with mood */}
        <div className={cn(
          "absolute inset-0 -z-20 rounded-full blur-2xl opacity-20 transition-all duration-700",
          mood === 'angry' ? "bg-red-500 scale-150" :
            mood === 'striking' ? "bg-red-500 scale-150" :
              mood === 'focusing' ? "bg-teal-500 scale-150" : "bg-indigo-500"
        )} />
      </motion.div>
    </div>
  );
}
