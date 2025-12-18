import { useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface FocusPlantProps {
  minutesFocused: number;
}

export function FocusPlant({ minutesFocused }: FocusPlantProps) {
  // --- ENHANCED GROWTH LOGIC ---
  // We scale things so 0-10 minutes gives immediate glorious feedback.

  // 1. COSMIC SEED (0 - 5 mins)
  // Pulse speed increases as it gets closer to sprouting.
  const seedScale = 1 + (Math.min(minutesFocused, 5) / 10); // Grows slightly
  const seedGlow = Math.min(minutesFocused, 5) / 5; // 0 to 1

  // 2. NEON SPROUT (5 - 20 mins)
  // Appears after 5 mins.
  const sproutProgress = Math.min(1, Math.max(0, (minutesFocused - 5) / 15));

  // 3. GLOWING TRUNK (20 - 60 mins)
  const treeProgress = Math.min(1, Math.max(0, (minutesFocused - 20) / 40));

  // 4. ETHEREAL FOLIAGE (40 - 120 mins)
  const foliageProgress = Math.min(1, Math.max(0, (minutesFocused - 40) / 80));

  // Random particles for "magic" atmosphere
  const particles = useMemo(() => [...Array(12)].map((_, i) => ({
    cx: 50 + Math.random() * 100,
    cy: 50 + Math.random() * 100,
    r: Math.random() * 2,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4
  })), []);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-slate-950 border border-indigo-500/20 shadow-2xl transition-all duration-500 hover:shadow-indigo-500/10 group">

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(60,20,100,0.4),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(15,23,42,0.8))]" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

      <div className="relative z-10 flex flex-col items-center justify-center py-10 px-6 min-h-[300px]">

        {/* --- MAIN SCENE --- */}
        <div className="relative w-64 h-64 flex items-end justify-center perspective-1000">

          {/* Glowing Platform */}
          <div className="absolute bottom-4 w-40 h-10 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />

          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(100,200,255,0.3)]">
            <defs>
              <linearGradient id="trunkGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#4f46e5" /> {/* Indigo-600 */}
                <stop offset="100%" stopColor="#a855f7" /> {/* Purple-500 */}
              </linearGradient>
              <linearGradient id="leafGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#2dd4bf" /> {/* Teal-400 */}
                <stop offset="100%" stopColor="#34d399" /> {/* Emerald-400 */}
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* FLOATING PARTICLES */}
            {particles.map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill="white"
                className="opacity-20 animate-float"
                style={{
                  animation: `float ${p.duration}s infinite ease-in-out`,
                  animationDelay: `${p.delay}s`
                }}
              />
            ))}

            {/* 1. THE SEED (Cyber Core) */}
            <g
              transform="translate(100, 175)"
              className={cn("transition-all duration-1000 origin-center", sproutProgress > 0.5 && "opacity-0")}
            >
              {/* Outer Shell */}
              <circle r="12" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" style={{ transform: `scale(${seedScale})` }} />
              {/* Inner Core Pulsing */}
              <circle r="6" fill="#818cf8" className="animate-ping" style={{ animationDuration: `${3 - seedGlow * 2}s` }} />
              <circle r="6" fill="#a5b4fc" style={{ opacity: 0.5 + seedGlow * 0.5 }} />
            </g>

            {/* 2. THE SPROUT (Neon Arc) */}
            <g transform="translate(100, 175)" style={{ opacity: sproutProgress }}>
              <path
                d="M0,0 Q0,-20 -10,-30"
                fill="none"
                stroke="url(#leafGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow)"
                style={{
                  strokeDasharray: 40,
                  strokeDashoffset: 40 - (40 * sproutProgress),
                  transition: 'stroke-dashoffset 1s ease-out'
                }}
              />
              <path
                d="M0,0 Q0,-15 10,-25"
                fill="none"
                stroke="url(#leafGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow)"
                style={{
                  strokeDasharray: 40,
                  strokeDashoffset: 40 - (40 * sproutProgress * 0.8), // Slightly slower
                  transition: 'stroke-dashoffset 1.2s ease-out'
                }}
              />
            </g>

            {/* 3. THE TRUNK (Cyber Structure) */}
            <g transform="translate(100, 175)">
              <path
                d="M0,0 C-5,-40 5,-80 0,-120"
                fill="none"
                stroke="url(#trunkGrad)"
                strokeWidth={8 * treeProgress}
                strokeLinecap="round"
                filter="url(#glow)"
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - treeProgress,
                  transition: "all 1s ease-out",
                  opacity: treeProgress > 0 ? 1 : 0
                }}
              />
            </g>

            {/* 4. THE FOLIAGE (Holographic Nodes) */}
            <g transform="translate(100, 55)" style={{ opacity: foliageProgress, transform: `translate(100px, 55px) scale(${foliageProgress})`, transition: 'all 1s' }}>
              {/* Main Orb */}
              <circle r="40" fill="url(#leafGrad)" fillOpacity="0.2" className="animate-pulse" filter="url(#glow)" />
              <circle r="25" fill="none" stroke="#2dd4bf" strokeWidth="1" className="animate-[spin_10s_linear_infinite]" strokeDasharray="4 4" />
              <circle r="35" fill="none" stroke="#818cf8" strokeWidth="0.5" className="animate-[spin_15s_linear_infinite_reverse]" />

              {/* Floating Leaves/Data points */}
              <circle cx="-30" cy="10" r="4" fill="#fff" className="animate-bounce" style={{ animationDelay: '0.1s' }} />
              <circle cx="30" cy="-20" r="3" fill="#fff" className="animate-bounce" style={{ animationDelay: '0.4s' }} />
              <circle cx="0" cy="-35" r="5" fill="#fff" className="animate-bounce" style={{ animationDelay: '0.8s' }} />
            </g>

          </svg>
        </div>

        {/* --- HUD STATS --- */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 animate-in fade-in slide-in-from-bottom-2">
            {minutesFocused < 5 && "Initializing Seed..."}
            {minutesFocused >= 5 && minutesFocused < 20 && "Sprout Detected"}
            {minutesFocused >= 20 && minutesFocused < 40 && "Structure Growing"}
            {minutesFocused >= 40 && "Ecosystem Thriving"}
          </h3>

          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-md">
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
              <div className="relative w-full h-full rounded-full bg-teal-500" />
            </div>
            <span className="font-mono text-sm text-slate-300">
              {Math.floor(minutesFocused / 60).toString().padStart(2, '0')}h : {(minutesFocused % 60).toString().padStart(2, '0')}m
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-widest">Focus Time</span>
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-1 mt-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
              style={{ width: `${Math.min(100, (minutesFocused / 60) * 100)}%`, transition: 'width 0.5s ease-out' }}
            />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -20px); }
        }
      `}</style>
    </div>
  );
}
