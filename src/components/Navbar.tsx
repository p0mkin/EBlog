import { getSession } from "@/lib/session";
import Link from "next/link";
import UserBadge from "./UserBadge";
import { isOwner as checkIsOwner } from "@/lib/auth-utils";
import { getCachedUserRole } from "@/lib/db";
import NotificationBell from "./NotificationBell";
import ThemeSwitcher from "./ThemeSwitcher";

export default async function Navbar() {
    const session = await getSession();
    const isOwner = checkIsOwner(session);
    const userRole = session?.user?.email
        ? await getCachedUserRole(session.user.email)
        : null;

    return (
        <nav className="sticky top-0 z-50 w-full glass-card border-x-0 border-t-0 py-2.5 px-6 md:px-10 flex justify-between items-center animate-in">
            <div className="flex items-center gap-5">
                <Link href="/" className="group flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm group-hover:scale-110 transition duration-300">
                        E
                    </div>
                    <span className="font-semibold tracking-tight premium-gradient-text hidden sm:inline text-sm">Photo Studio</span>
                </Link>
                <div className="h-3.5 w-[1px] bg-zinc-800" />
                <Link href="/gallery" className="text-xs text-zinc-400 hover:text-white transition">
                    Gallery
                </Link>
                <div className="h-3.5 w-[1px] bg-zinc-800" />
                <Link href="/feed" className="text-xs text-zinc-400 hover:text-white transition">
                    Feed
                </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <ThemeSwitcher />
                {isOwner && (
                    <Link
                        href="/vault"
                        className="relative p-1.5 md:p-2 rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white group"
                        title="Secure Vault"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-300">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </Link>
                )}
                {session?.user ? (
                    <>
                        <Link href="/messages" className="relative p-1.5 md:p-2 rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </Link>
                        <NotificationBell />
                        <UserBadge user={session.user} isOwner={isOwner} userRole={userRole} />
                    </>
                ) : (
                    <Link
                        href="/api/auth/signin"
                        className="text-xs font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-200 transition"
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}
