import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import RolesManager from "@/components/RolesManager";

export default async function AdminRolesPage() {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    if (!isOwner) redirect('/');

    return (
        <div className="p-8 md:p-12 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
                        <Link href="/gallery" className="hover:text-zinc-300 transition">Gallery</Link>
                        <span>/</span>
                        <span>Admin</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight premium-gradient-text">
                        Role Management
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2 max-w-md">
                        Create roles, assign users, and control album access.
                    </p>
                </div>
                <Link
                    href="/gallery"
                    className="px-5 py-2 rounded-full border border-white/10 text-xs font-bold text-zinc-400 hover:text-white hover:border-white/30 transition"
                >
                    ← Back to Gallery
                </Link>
            </div>

            <RolesManager />
        </div>
    );
}
