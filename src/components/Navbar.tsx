import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from "next/link";
import UserBadge from "./UserBadge";

export default async function Navbar() {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();

    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();

    const isOwner = (!!ownerEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    return (
        <nav className="sticky top-0 z-50 w-full glass-card border-x-0 border-t-0 p-4 px-6 md:px-12 flex justify-between items-center animate-in">
            <div className="flex items-center gap-6">
                <Link href="/" className="group flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-lg group-hover:scale-110 transition duration-300">
                        E
                    </div>
                    <span className="font-semibold tracking-tight premium-gradient-text hidden sm:inline">Photo Studio</span>
                </Link>
                <div className="h-4 w-[1px] bg-zinc-800" />
                <Link href="/gallery" className="text-sm text-zinc-400 hover:text-white transition">
                    Gallery
                </Link>
            </div>

            <div className="flex items-center gap-4">
                {session?.user ? (
                    <UserBadge user={session.user} isOwner={isOwner} />
                ) : (
                    <Link
                        href="/api/auth/signin"
                        className="text-sm font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-200 transition"
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}
