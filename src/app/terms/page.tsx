export default function TermsOfService() {
    return (
        <main className="min-h-[calc(100vh-73px)] p-6 md:p-12 flex flex-col items-center justify-start animate-in">
            <div className="max-w-3xl w-full space-y-12">
                <div className="space-y-4 text-center mt-8">
                    <div className="inline-block px-3 py-1 rounded-full border border-white/10 glass-card text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Legal
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none premium-gradient-text">
                        Terms of Service
                    </h1>
                    <p className="text-zinc-500 text-lg">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/5 space-y-8 text-zinc-300 leading-relaxed relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full transition-opacity duration-700 opacity-0 group-hover:opacity-100 pointer-events-none" />
                    
                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using Photo Studio, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                        </p>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">2. Use License</h2>
                        <p>
                            Permission is granted to temporarily download one copy of the materials (information or software) on Photo Studio&apos;s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                            <li>modify or copy the materials;</li>
                            <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                            <li>attempt to decompile or reverse engineer any software contained on Photo Studio&apos;s website;</li>
                            <li>remove any copyright or other proprietary notations from the materials; or</li>
                            <li>transfer the materials to another person or &quot;mirror&quot; the materials on any other server.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">3. Disclaimer</h2>
                        <p>
                            The materials on Photo Studio&apos;s website are provided on an &apos;as is&apos; basis. Photo Studio makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </p>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">4. Limitations</h2>
                        <p>
                            In no event shall Photo Studio or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Photo Studio&apos;s website, even if Photo Studio or a Photo Studio authorized representative has been notified orally or in writing of the possibility of such damage.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
