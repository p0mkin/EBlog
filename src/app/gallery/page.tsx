import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from 'next/link';
import SyncButton from '@/components/SyncButton';
import StorageDashboard from '@/components/StorageDashboard';
import DeleteEmptyAlbumsButton from '@/components/DeleteEmptyAlbumsButton';
import CreateAlbumButton from '@/components/CreateAlbumButton';



export default async function GalleryPage() {
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    const albums = await prisma.album.findMany({
        where: {
            parentId: null,
            OR: isOwner ? undefined : [
                { visibility: 'public' },
                { permissions: { some: { user: { email: session?.user?.email || '' } } } }
            ]
        },
        orderBy: { name: 'asc' },
    });

    // Fetch cover photos for albums
    const albumsWithCovers = await Promise.all(
        albums.map(async (album) => {
            let coverUrl: string | null = null;
            if (album.coverPhotoId) {
                const cover = await prisma.photo.findUnique({ where: { id: album.coverPhotoId } });
                if (cover) coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(cover.r2Key)}&w=600&v=2`;
            }
            if (!coverUrl) {
                // Auto-detect: first photo in this album or any child
                const firstPhoto = await prisma.photo.findFirst({
                    where: { album: { OR: [{ id: album.id }, { parentId: album.id }] } },
                    orderBy: { uploadedAt: 'asc' }
                });
                if (firstPhoto) coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(firstPhoto.r2Key)}&w=600&v=2`;
            }
            return { ...album, coverUrl };
        })
    );

    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight premium-gradient-text mb-2">
                        Collections
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base max-w-md">
                        Explore my private archives of personal and travel photography.
                    </p>
                </div>

                {isOwner && (
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/admin/roles"
                                className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 glass-card hover:border-white/20 transition flex items-center gap-2"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Roles
                            </Link>
                            <CreateAlbumButton />
                            <DeleteEmptyAlbumsButton />
                            <SyncButton />
                        </div>


                        <StorageDashboard />
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
