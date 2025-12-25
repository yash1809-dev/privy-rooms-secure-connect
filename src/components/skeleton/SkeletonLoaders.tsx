export function ZoneSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-white/5 rounded" />
                    <div className="h-4 w-32 bg-white/5 rounded" />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="grid gap-4">
                <div className="h-64 bg-white/5 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-48 bg-white/5 rounded-2xl" />
                    <div className="h-48 bg-white/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 animate-pulse">
            <div className="h-5 w-32 bg-white/5 rounded" />
            <div className="h-32 bg-white/5 rounded" />
            <div className="flex gap-2">
                <div className="h-4 w-16 bg-white/5 rounded" />
                <div className="h-4 w-24 bg-white/5 rounded" />
            </div>
        </div>
    );
}
