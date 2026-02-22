export default function Loading() {
    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex flex-col gap-4">
                    <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
                    <div>
                        <div className="h-3 w-32 rounded bg-white/5 animate-pulse mb-2" />
                        <div className="h-12 w-56 rounded-lg bg-white/5 animate-pulse" />
                    </div>
                </div>
            </div>
            <div className="space-y-16">
                <section>
                    <div className="h-4 w-40 rounded bg-white/5 animate-pulse mb-6" />
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse"
                                style={{
                                    height: `${200 + (i % 3) * 80}px`,
                                    animationDelay: `${i * 80}ms`,
                                }}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
