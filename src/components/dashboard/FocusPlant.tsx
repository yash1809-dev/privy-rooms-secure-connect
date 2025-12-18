import { cn } from "@/lib/utils";

interface FocusPlantProps {
  minutesFocused: number;
}

export function FocusPlant({ minutesFocused }: FocusPlantProps) {
  const growth = Math.min(100, (minutesFocused / 120) * 100);
  const stage =
    minutesFocused < 5 ? 'seed' :
      minutesFocused < 20 ? 'sprout' :
        minutesFocused < 60 ? 'young' : 'mature';

  const leafCount = Math.min(8, Math.floor(minutesFocused / 5));

  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <div className="relative h-80 flex items-end justify-center pb-8">

        {/* Ambient Glow */}
        <div className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl transition-all duration-1000",
          stage === 'seed' ? "bg-amber-500/20" :
            stage === 'sprout' ? "bg-teal-500/25" :
              "bg-emerald-500/30"
        )} />

        <div className="relative z-10 flex flex-col items-center">

          {/* TERRACOTTA POT */}
          <div className="absolute bottom-0 w-32 h-24 bg-gradient-to-br from-orange-800 via-orange-700 to-orange-900 rounded-b-3xl shadow-2xl"
            style={{
              clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
              boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.5)'
            }}>
            {/* Pot rim */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-36 h-4 bg-gradient-to-b from-orange-600 to-orange-800 rounded-full shadow-lg border-b border-orange-900" />
            {/* Pot shine */}
            <div className="absolute top-4 left-4 w-12 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full" />
          </div>

          {/* SOIL */}
          <div className="absolute bottom-20 w-28 h-3 bg-gradient-to-b from-amber-900 to-stone-950 rounded-full shadow-inner" />

          {/* SEED STAGE */}
          {stage === 'seed' && (
            <div className="absolute bottom-20 flex items-center justify-center">
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg animate-pulse" />
                <div className="absolute inset-0 bg-yellow-300 rounded-full blur-md animate-pulse opacity-50" />
              </div>
            </div>
          )}

          {/* STEM */}
          {minutesFocused >= 5 && (
            <div
              className="absolute bottom-20 w-2 bg-gradient-to-t from-green-800 via-green-600 to-green-500 rounded-full transition-all duration-1000 shadow-lg"
              style={{
                height: `${Math.min(100, growth * 1.2)}px`,
                transformOrigin: 'bottom center'
              }}
            />
          )}

          {/* LEAVES */}
          {minutesFocused >= 10 && [...Array(leafCount)].map((_, i) => {
            const isLeft = i % 2 === 0;
            const yPos = 80 + (i * 12);
            const leafSize = 1 - (i * 0.08);

            return (
              <div
                key={i}
                className="absolute transition-all duration-700"
                style={{
                  bottom: `${yPos}px`,
                  left: isLeft ? '45%' : '55%',
                  transform: `translateX(-50%) rotate(${isLeft ? -45 : 45}deg)`,
                  opacity: Math.min(1, (minutesFocused - 10 - i * 3) / 10)
                }}
              >
                <div
                  className="relative"
                  style={{
                    animation: `sway ${3 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                >
                  {/* Leaf shape */}
                  <div
                    className="bg-gradient-to-br from-green-400 via-green-500 to-green-700 rounded-full shadow-lg"
                    style={{
                      width: `${40 * leafSize}px`,
                      height: `${25 * leafSize}px`,
                      borderRadius: '50% 0% 50% 0%',
                      boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), 2px 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Leaf vein */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-green-600 opacity-30" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* FLOWERS */}
          {minutesFocused >= 60 && [0, 1].map((i) => (
            <div
              key={i}
              className="absolute transition-all duration-1000"
              style={{
                bottom: `${140 + i * 20}px`,
                left: i === 0 ? '35%' : '65%',
                opacity: Math.min(1, (minutesFocused - 60 - i * 15) / 20)
              }}
            >
              {/* Flower center */}
              <div className="relative w-6 h-6 bg-yellow-400 rounded-full shadow-lg">
                {/* Petals */}
                {[...Array(6)].map((_, p) => (
                  <div
                    key={p}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      transform: `rotate(${p * 60}deg) translateY(-8px)`,
                    }}
                  >
                    <div className="w-4 h-4 bg-gradient-to-br from-pink-300 to-pink-500 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Growth Stats */}
      <div className="mt-6 text-center space-y-3">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all backdrop-blur-sm",
          stage === 'seed' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
            stage === 'sprout' ? "bg-teal-500/10 border-teal-500/30 text-teal-400" :
              stage === 'young' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                "bg-green-500/10 border-green-500/30 text-green-400"
        )}>
          <span className="text-2xl">
            {stage === 'seed' && '🌱'}
            {stage === 'sprout' && '🌿'}
            {stage === 'young' && '🪴'}
            {stage === 'mature' && '🌺'}
          </span>
          <span className="font-bold text-sm">
            {stage === 'seed' && 'Planting Seed'}
            {stage === 'sprout' && 'First Sprout!'}
            {stage === 'young' && 'Growing Well'}
            {stage === 'mature' && 'In Full Bloom'}
          </span>
        </div>

        <div className="max-w-xs mx-auto space-y-2">
          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                stage === 'seed' ? "bg-gradient-to-r from-amber-500 to-yellow-500" :
                  "bg-gradient-to-r from-emerald-500 to-green-400"
              )}
              style={{ width: `${growth}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">{minutesFocused} min</span>
            <span className="font-bold text-emerald-400">{Math.floor(growth)}%</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
