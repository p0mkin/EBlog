export default function CookiePolicy() {
    return (
        <main className="min-h-[calc(100vh-73px)] p-6 md:p-12 flex flex-col items-center justify-start animate-in">
            <div className="max-w-3xl w-full space-y-12">
                <div className="space-y-4 text-center mt-8">
                    <div className="inline-block px-3 py-1 rounded-full border border-white/10 glass-card text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Legal
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none premium-gradient-text">
                        Cookie Policy
                    </h1>
                    <p className="text-zinc-500 text-lg">
                        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>

                <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/5 space-y-8 text-zinc-300 leading-relaxed relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full transition-opacity duration-700 opacity-0 group-hover:opacity-100 pointer-events-none" />
                    
                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">1. What Are Cookies?</h2>
                        <p>
                            Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.
                        </p>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">2. How We Use Cookies</h2>
                        <p>
                            When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                            <li>To enable certain functions of the Service.</li>
                            <li>To provide analytics and understand how our Service is being used.</li>
                            <li>To store your preferences, such as the current UI theme.</li>
                            <li>To enable authentication and verify your session securely.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">3. Types of Cookies We Use</h2>
                        <p>
                            We use both session and persistent cookies on the Service and we use different types of cookies to run the Service:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                            <li><strong className="text-zinc-200">Essential Cookies:</strong> We may use essential cookies to authenticate users and prevent fraudulent use of user accounts.</li>
                            <li><strong className="text-zinc-200">Preference Cookies:</strong> We may use preference cookies to remember information that changes the way the Service behaves or looks, like your &quot;remember me&quot; functionality or preferred language.</li>
                            <li><strong className="text-zinc-200">Analytics Cookies:</strong> We may use analytics cookies to track information how the Service is used so that we can make improvements.</li>
                        </ul>
                    </section>

                    <section className="space-y-4 z-10 relative">
                        <h2 className="text-2xl font-bold text-white tracking-tight">4. Your Choices Regarding Cookies</h2>
                        <p>
                            If you&apos;d like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
