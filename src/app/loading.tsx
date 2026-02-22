export default function Loading() {
    return (
        <main className="min-h-[calc(100vh-73px)] p-6 md:p-12 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="h-6 w-40 rounded-full bg-white/5 animate-pulse" />
                    <div className="space-y-3">
                        <div className="h-14 w-72 rounded-lg bg-white/5 animate-pulse" />
                        <div className="h-14 w-56 rounded-lg bg-white/5 animate-pulse" />
                    </div>
                    <div className="h-5 w-64 rounded bg-white/5 animate-pulse" />
                    <div className="flex gap-4 pt-4">
                        <div className="h-12 w-40 rounded-full bg-white/5 animate-pulse" />
                        <div className="h-12 w-28 rounded-full bg-white/5 animate-pulse" />
                    </div>
                </div>
                <div className="aspect-square md:h-[500px] rounded-3xl bg-white/[0.03] border border-white/[0.08] animate-pulse" />
            </div>
        </main>
    );
}
