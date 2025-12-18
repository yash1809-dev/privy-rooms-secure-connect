import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface FocusPlantProps {
  minutesFocused: number;
}

export function FocusPlant({ minutesFocused }: FocusPlantProps) {
  // Growth stages based on time
  const growth = Math.min(100, (minutesFocused / 120) * 100); // 120 min = full growth
  const stage =
    minutesFocused < 5 ? 'seed' :
      minutesFocused < 20 ? 'sprout' :
        minutesFocused < 60 ? 'young' : 'mature';

  const leaves = useMemo(() => {
    const count = Math.floor((minutesFocused / 10) * 3);
    return [...Array(Math.min(count, 12))].map((_, i) => ({
      angle: (i * 360 / count) + (i % 2 * 30),
      delay: i * 0.1,
      size: 0.7 + (i % 3) * 0.15
    }));
  }, [minutesFocused]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-square flex items-end justify-center px-8 pb-8">

        {/* Ambient Glow */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-all duration-1000",
          stage === 'seed' ? "bg-amber-500/20" :
            stage === 'sprout' ? "bg-teal-500/30" :
              "bg-emerald-500/40"
        )} />

        {/* Plant Container */}
        <div className="relative w-full h-full flex flex-col items-center justify-end">

          {/* PLANT POT */}
          <svg viewBox="0 0 200 280" className="w-full h-full overflow-visible">
            <defs>
              {/* Gradients */}
              <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#44403c" />
              </linearGradient>
              <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="100%" stopColor="#292524" />
              </linearGradient>
              <linearGradient id="stemGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="50%" stopColor="#15803d" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <radialGradient id="leafGrad">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="70%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#166534" />
              </radialGradient>

              {/* Filters */}
              <filter id="shadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="4" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* POT */}
            <g filter="url(#shadow)">
              {/* Pot body */}
              <path
                d="M 60 240 L 70 200 L 130 200 L 140 240 Z"
                fill="url(#potGrad)"
                stroke="#57534e"
                strokeWidth="2"
              />
              {/* Pot rim */}
              <ellipse cx="100" cy="200" rx="35" ry="8" fill="#78350f" stroke="#57534e" strokeWidth="1.5" />
              <ellipse cx="100" cy="200" rx="32" ry="6" fill="#a16207" opacity="0.3" />
              {/* Pot base */}
              <ellipse cx="100" cy="240" rx="25" ry="6" fill="#292524" />

              {/* Pot pattern */}
              <line x1="70" y1="205" x2="75" y2="235" stroke="#57534e" strokeWidth="1" opacity="0.3" />
              <line x1="100" y1="205" x2="100" y2="235" stroke="#57534e" strokeWidth="1" opacity="0.3" />
              <line x1="130" y1="205" x2="125" y2="235" stroke="#57534e" strokeWidth="1" opacity="0.3" />
            </g>

            {/* SOIL */}
            <ellipse cx="100" cy="202" rx="30" ry="7" fill="url(#soilGrad)" />

            {/* SEED STAGE */}
            {stage === 'seed' && (
              <g>
                <circle
                  cx="100"
                  cy="195"
                  r="5"
                  fill="#f59e0b"
                  className="animate-pulse"
                >
                  <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="195" r="8" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3" className="animate-ping" />
              </g>
            )}

            {/* STEM */}
            {minutesFocused >= 5 && (
              <g>
                <path
                  d={`M 100 195 Q 95 ${195 - growth * 0.8} 100 ${195 - growth}`}
                  fill="none"
                  stroke="url(#stemGrad)"
                  strokeWidth={Math.min(6, 2 + growth / 20)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                {/* Stem details */}
                <path
                  d={`M 100 ${195 - growth * 0.3} Q 102 ${195 - growth * 0.4} 100 ${195 - growth * 0.5}`}
                  fill="none"
                  stroke="#86efac"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              </g>
            )}

            {/* LEAVES */}
            {minutesFocused >= 10 && leaves.map((leaf, i) => {
              const stemY = 195 - growth;
              const leafY = stemY + (i * 8);
              const isLeft = i % 2 === 0;

              return (
                <g key={i} opacity={Math.min(1, (minutesFocused - 10 - i * 2) / 5)}>
                  {/* Leaf */}
                  <ellipse
                    cx={100 + (isLeft ? -15 : 15) * leaf.size}
                    cy={leafY}
                    rx={12 * leaf.size}
                    ry={20 * leaf.size}
                    fill="url(#leafGrad)"
                    stroke="#15803d"
                    strokeWidth="1"
                    transform={`rotate(${isLeft ? -30 : 30} ${100 + (isLeft ? -15 : 15) * leaf.size} ${leafY})`}
                    filter="url(#shadow)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values={`${isLeft ? -35 : 35} ${100 + (isLeft ? -15 : 15) * leaf.size} ${leafY};${isLeft ? -25 : 25} ${100 + (isLeft ? -15 : 15) * leaf.size} ${leafY};${isLeft ? -35 : 35} ${100 + (isLeft ? -15 : 15) * leaf.size} ${leafY}`}
                      dur={`${3 + leaf.delay}s`}
                      repeatCount="indefinite"
                    />
                  </ellipse>
                  {/* Leaf vein */}
                  <line
                    x1={100}
                    y1={leafY}
                    x2={100 + (isLeft ? -15 : 15) * leaf.size}
                    y2={leafY}
                    stroke="#86efac"
                    strokeWidth="0.5"
                    opacity="0.4"
                  />
                </g>
              );
            })}

            {/* FLOWERS (mature stage) */}
            {minutesFocused >= 60 && (
              <g>
                {[0, 1, 2].map((i) => (
                  <g key={i} opacity={Math.min(1, (minutesFocused - 60 - i * 10) / 15)}>
                    <circle
                      cx={100 + (i === 1 ? 0 : i === 0 ? -20 : 20)}
                      cy={80 - growth * 0.3 + i * 5}
                      r="6"
                      fill="#fbbf24"
                      filter="url(#shadow)"
                    />
                    {[...Array(5)].map((_, petal) => (
                      <ellipse
                        key={petal}
                        cx={100 + (i === 1 ? 0 : i === 0 ? -20 : 20)}
                        cy={80 - growth * 0.3 + i * 5}
                        rx="4"
                        ry="8"
                        fill="#fef3c7"
                        stroke="#f59e0b"
                        strokeWidth="0.5"
                        transform={`rotate(${petal * 72} ${100 + (i === 1 ? 0 : i === 0 ? -20 : 20)} ${80 - growth * 0.3 + i * 5})`}
                      />
                    ))}
                  </g>
                ))}
              </g>
            )}

          </svg>
        </div>

        {/* Floating particles */}
        {minutesFocused >= 20 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-[float_3s_ease-in-out_infinite]"
                style={{
                  left: `${30 + Math.random() * 40}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.6
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Growth Stats */}
      <div className="mt-6 text-center space-y-2">
        <p className={cn(
          "text-lg font-bold transition-colors",
          stage === 'seed' ? "text-amber-500" :
            stage === 'sprout' ? "text-teal-500" :
              stage === 'young' ? "text-emerald-500" :
                "text-green-400"
        )}>
          {stage === 'seed' && '🌱 Seed Stage'}
          {stage === 'sprout' && '🌿 Sprouting'}
          {stage === 'young' && '🪴 Growing Strong'}
          {stage === 'mature' && '🌸 Fully Bloomed'}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <span className="font-mono">{minutesFocused}m focused</span>
          <span>•</span>
          <span>{Math.floor(growth)}% grown</span>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
      `}</style>
    </div>
  );
}
