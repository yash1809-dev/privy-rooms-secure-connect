import { Skeleton } from "@/components/ui/skeleton";

export function ChatsSkeleton() {
    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Sidebar - Desktop only */}
            <aside className="hidden lg:flex flex-col w-20 border-r bg-card">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header Skeleton */}
                <div className="sticky top-0 z-10 bg-card border-b p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>

                {/* Chat List Skeleton */}
                <div className="flex-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-5 w-8 rounded-full ml-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
