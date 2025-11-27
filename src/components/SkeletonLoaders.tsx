import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header Skeleton */}
            <div className="mb-8">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* Timetable Skeleton */}
            <div className="mb-8">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            </div>

            {/* Voice Notes Skeleton */}
            <div>
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
};

export const ChatsSkeleton = () => {
    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar Skeleton - Desktop only */}
            <aside className="hidden lg:flex flex-col w-20 border-r bg-card">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </aside>

            {/* Main Content */}
            <div className="flex-1">
                {/* Header Skeleton */}
                <div className="border-b p-4">
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-8 w-48" />
                </div>

                {/* Chat List Skeleton */}
                <div className="divide-y">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const GroupChatSkeleton = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header Skeleton */}
            <div className="border-b p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </div>

            {/* Messages Skeleton */}
            <div className="flex-1 p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
                    </div>
                ))}
            </div>

            {/* Input Skeleton */}
            <div className="border-t p-4">
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
};

export const ProfileSkeleton = () => {
    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <Skeleton className="h-8 w-32 mb-8" />

            {/* Profile Card */}
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    );
};
