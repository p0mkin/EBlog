export default function Loading() {
    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="h-12 w-64 rounded-lg bg-white/5 animate-pulse mb-2" />
                    <div className="h-4 w-80 rounded bg-white/5 animate-pulse" />
                </div>
            </header>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="aspect-[4/3] rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-pulse"
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
