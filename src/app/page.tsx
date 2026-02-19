import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from 'next/link';

export default async function Page() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-[calc(100vh-73px)] p-6 md:p-12 flex flex-col items-center justify-center animate-in">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-block px-3 py-1 rounded-full border border-white/10 glass-card text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            personal archive W.I.P
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none premium-gradient-text">
            Capturing <br /> the Unseen.
          </h1>
          <p className="text-zinc-500 text-lg max-w-sm leading-relaxed">
            A private collection of photographic memories, eye-gazmic quality due to compression-less uploads.
          </p>

          <div className="flex gap-4 pt-4">
            {session?.user ? (
              <Link href="/gallery" className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Explore Gallery
              </Link>
            ) : (
              <Link href="/api/auth/signin" className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition duration-300">
                Begin Session
              </Link>
            )}
            <a href="https://github.com/p0mkin" target="_blank" className="px-8 py-3 glass-card rounded-full font-bold hover:bg-white/10 transition duration-300 border border-white/5">
              GitHub
            </a>
          </div>
        </div>

        <div className="relative aspect-square md:aspect-auto md:h-[500px] glass-card rounded-3xl overflow-hidden border-white/5 group">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black opacity-50 transition-opacity group-hover:opacity-30" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white mx-auto flex items-center justify-center text-black text-2xl font-black mb-6 rotate-3 group-hover:rotate-0 transition duration-500">E</div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300 transition italic">Vibed By</p>
              <p className="text-2xl font-bold premium-gradient-text">Eitvydas</p>
            </div>
          </div>
          {/* Decorative glow */}
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full" />
        </div>
      </div>
    </main>
  );
}
