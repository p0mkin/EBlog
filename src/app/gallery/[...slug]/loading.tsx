export default function Loading() {
    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            {/* Top Navigation Bar Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border border-white/5 bg-white/5 animate-pulse" />
                        <div className="w-10 h-4 bg-white/5 rounded animate-pulse" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="w-32 h-3 bg-white/5 rounded-sm animate-pulse" />
                        <div className="w-48 md:w-64 h-12 bg-white/10 rounded-lg animate-pulse" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-24 h-10 bg-white/5 rounded-full animate-pulse" />
                    <div className="w-10 h-10 bg-white/5 rounded-md animate-pulse" />
                </div>
            </div>

            <div className="space-y-16">
                {/* Child Albums Skeleton */}
                <section>
                    <div className="w-48 h-4 bg-white/5 rounded-sm mb-6 animate-pulse" />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="aspect-[4/3] rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-pulse"
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>
                </section>

                {/* Photos Skeleton */}
                <section>
                    <div className="w-32 h-4 bg-white/5 rounded-sm mb-6 animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 md:gap-4 lg:gap-6">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square bg-white/[0.03] animate-pulse rounded-none md:rounded-2xl"
                                style={{ animationDelay: `${i * 50}ms` }}
                            />
                        ))}
                    </div>
                </section>
            </div>

            {/* Center Loading Spinner Overlay */}
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white animate-spin drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            </div>
        </div>
    );
}
