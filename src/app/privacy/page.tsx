export default function PrivacyPolicy() {
    return (
        <main className="min-h-[calc(100vh-73px)] p-6 md:p-12 flex flex-col items-center justify-start animate-in">
            <div className="max-w-3xl w-full space-y-12">
                <div className="space-y-4 text-center mt-8">
                    <div className="inline-block px-3 py-1 rounded-full border border-white/10 glass-card text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Legal
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none premium-gradient-text">
                        Privacy Policy
                    </h1>
                    <p className="text-zinc-500 text-lg">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/5 space-y-8 text-zinc-300 leading-relaxed relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full transition-opacity duration-700 opacity-0 group-hover:opacity-100 pointer-events-none" />
                    
                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">1. Introduction</h2>
                        <p>
                            Welcome to Photo Studio. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">2. The Data We Collect</h2>
                        <p>
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                            <li><strong className="text-zinc-200">Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong className="text-zinc-200">Contact Data:</strong> includes email address and telephone numbers.</li>
                            <li><strong className="text-zinc-200">Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                            <li><strong className="text-zinc-200">Profile Data:</strong> includes your username and password, purchases or orders made by you, your interests, preferences, feedback and survey responses.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">3. How We Use Your Data</h2>
                        <p>
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li>Where we need to comply with a legal obligation.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">4. Data Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">5. Your Legal Rights</h2>
                        <p>
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
