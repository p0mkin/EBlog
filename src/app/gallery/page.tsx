import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from 'next/link';
import StorageDashboard from '@/components/StorageDashboard';

import { getCachedAlbums } from '@/lib/db';

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ showArchived?: string }> }) {
    const session = await getServerSession(authOptions);
    const { showArchived } = await searchParams;
    const isArchivedView = showArchived === 'true';

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    // Cached: revalidates every 60s or on tag invalidation
    const albumsWithCovers = await getCachedAlbums(isOwner, isArchivedView, session?.user?.email || null);

    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight premium-gradient-text mb-2">
                        Collections
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base max-w-md">
                        Explore my private archives of personal and travel photography.
                    </p>
                </div>

                {isOwner && (
                    <div className="flex flex-col-reverse sm:flex-row items-end sm:items-end gap-4">
                        <StorageDashboard isArchivedView={isArchivedView} />
                    </div>
                )}
            </header>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {albumsWithCovers.length === 0 && (
                    <div className="col-span-full border border-dashed border-zinc-800 rounded-2xl p-20 text-center">
                        <p className="text-zinc-500 text-lg mb-4">Your gallery is currently empty.</p>
                        {isOwner && (
                            <p className="text-sm text-zinc-600">Use the Sync R2 button to import photos from your bucket.</p>
                        )}
                    </div>
                )}
                {albumsWithCovers.map((album, i) => (
                    <Link
                        key={album.id}
                        href={`/gallery/${album.slug}`}
                        className="group relative flex flex-col justify-end aspect-[4/3] rounded-2xl p-6 glass-card overflow-hidden transition-all duration-500 hover:scale-[1.02]"
                    >
                        {album.coverUrl ? (
                            <img
                                src={album.coverUrl}
                                alt={album.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black opacity-40 group-hover:opacity-60 transition-opacity" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />



                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Album</span>
                            <p className="text-xl font-bold text-white tracking-tight drop-shadow-lg">
                                {album.name}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
