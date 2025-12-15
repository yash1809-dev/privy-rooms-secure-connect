import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--gradient-subtle)]">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Profile Card Skeleton */}
                <div className="mb-8 border rounded-lg p-6 bg-card">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Skeleton className="h-7 w-32 mb-2" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>

                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />

                        <div className="flex-1 min-w-0 space-y-3">
                            {/* Username */}
                            <Skeleton className="h-6 w-40" />

                            {/* Email */}
                            <Skeleton className="h-4 w-56" />

                            {/* Bio */}
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />

                            {/* Links */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-40" />
                            </div>

                            {/* Stats */}
                            <Skeleton className="h-4 w-60 mt-2" />
                        </div>
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32 rounded-md" />
                        <Skeleton className="h-10 w-32 rounded-md" />
                    </div>

                    {/* List Items */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    ))}
                </div>

                {/* Back Button */}
                <div className="mt-6">
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            </div>
        </div>
    );
}
