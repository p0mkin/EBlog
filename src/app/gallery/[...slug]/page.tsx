import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getDownloadUrl } from '@/lib/r2';
import { getOraclePublicUrl } from '@/lib/oracle';
import UploadModal from '@/components/UploadModal';
import PhotoGrid from '@/components/PhotoGrid';
import CreateAlbumButton from '@/components/CreateAlbumButton';

import AlbumActionsMenu from '@/components/AlbumActionsMenu';
import { prisma } from '@/lib/prisma';
import { getCachedAlbumByPath, getCachedAllPhotosRecursive } from '@/lib/db';

interface PageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<{ showArchived?: string }>;
}

export default async function AlbumPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { showArchived } = await searchParams;
    const isArchivedView = showArchived === 'true';
    const session = await getServerSession(authOptions);

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    const isOwner = (!!ownerEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));

    // Cached: album tree resolution + photos + children covers (60s TTL)
    const currentAlbum = await getCachedAlbumByPath(slug, isOwner, isArchivedView);
    if (!currentAlbum) notFound();

    const hasPermission = isOwner || currentAlbum.permissions.some((p: any) => p.user?.email === session?.user?.email);
    if (!hasPermission) redirect('/gallery');

    // Get current user's DB id for like checks (lightweight query, not cached)
    let currentUserId: string | null = null;
    if (session?.user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
        currentUserId = dbUser?.id ?? null;
    }

    // Build photo data with thumbnail + full URLs
    const photosForGrid = await Promise.all(
        currentAlbum.photos.map(async (photo: any) => {
            try {
                const isOracle = photo.storageProvider === 'oracle';
                const isHeic = /\.heic$/i.test(photo.filename);

                let fullUrl: string;
                if (isOracle) {
                    fullUrl = getOraclePublicUrl(photo.r2Key);
                } else if (isHeic) {
                    // Browsers can't display HEIC — route through sharp for lossless JPEG conversion
                    fullUrl = `/api/photos/thumbnail?key=${encodeURIComponent(photo.r2Key)}&full=1&v=2`;
                } else {
                    fullUrl = await getDownloadUrl(photo.r2Key);
                }
                const thumbnailUrl = `/api/photos/thumbnail?key=${encodeURIComponent(photo.r2Key)}&w=400&v=2`;
                const likeCount = photo.likes?.length ?? 0;
                const liked = currentUserId ? photo.likes?.some((l: any) => l.userId === currentUserId) : false;
                return {
                    id: photo.id,
                    albumId: currentAlbum.id,
                    filename: photo.filename,
                    fileSize: photo.fileSize,
                    uploadedAt: photo.uploadedAt || '',
                    thumbnailUrl,
                    fullUrl,
                    width: photo.width,
                    height: photo.height,
                    caption: photo.caption ?? null,
                    sortOrder: photo.sortOrder ?? null,
                    liked,
                    likeCount,
                };
            } catch { return null; }
        })
    );
    const validPhotos = photosForGrid.filter(Boolean);

    // Get ALL photos (including from sub-albums) for cover picker — cached
    let allPhotosForCover: { id: string; filename: string; thumbnailUrl: string }[] = [];
    if (isOwner) {
        const allRaw = await getCachedAllPhotosRecursive(currentAlbum.id);
        allPhotosForCover = allRaw.map(p => ({
            id: p.id,
            filename: p.filename,
            thumbnailUrl: `/api/photos/thumbnail?key=${encodeURIComponent(p.r2Key)}&w=400&v=2`,
        }));
    }

    // Children already have covers from the cached query
    const childAlbumsWithCovers = currentAlbum.children;

    const hasChildren = currentAlbum.children.length > 0;
    const hasPhotos = validPhotos.length > 0;
    const breadcrumb = slug.slice(0, -1);

    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
            {/* Top Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex flex-col gap-4">
                    <Link
                        href={breadcrumb.length > 0 ? `/gallery/${breadcrumb.join('/')}` : '/gallery'}
                        className="group flex items-center gap-2 text-zinc-500 hover:text-white transition"
                    >
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition duration-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                        </div>
                        <span className="text-sm font-medium">Back</span>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
                            <Link href="/gallery" className="hover:text-zinc-300 transition">Gallery</Link>
                            {breadcrumb.map((part, i) => (
                                <span key={i} className="flex items-center gap-2">
                                    <span>/</span>
                                    <Link href={`/gallery/${slug.slice(0, i + 1).join('/')}`} className="hover:text-zinc-300 transition">{part}</Link>
                                </span>
                            ))}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight premium-gradient-text">
                            {currentAlbum.name}
                        </h1>
                    </div>
                </div>

                {isOwner && (
                    <div className="flex items-center gap-3">
                        <CreateAlbumButton parentId={currentAlbum.id} label="Sub-Album" />
                        <UploadModal albumId={currentAlbum.id} />
                        <AlbumActionsMenu
                            albumId={currentAlbum.id}
                            albumName={currentAlbum.name}
                            isArchived={currentAlbum.visibility === 'archived'}
                            isArchivedView={isArchivedView}
                            currentUrl={`/gallery/${slug.join('/')}`}
                            breadcrumb={breadcrumb}
                            allPhotosForCover={allPhotosForCover}
                            currentCoverId={currentAlbum.coverPhotoId}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-16">
                {/* Child Albums */}
                {hasChildren && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-3">
                            Collections in {currentAlbum.name}
                            <div className="h-[1px] flex-1 bg-zinc-800" />
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {childAlbumsWithCovers.map((child: any, i: number) => (
                                <Link
                                    key={child.id}
                                    href={`/gallery/${slug.join('/')}/${child.slug}`}
                                    className="group relative flex flex-col justify-end aspect-square rounded-2xl p-6 glass-card overflow-hidden transition-all duration-500"
                                >
                                    {child.coverUrl ? (
                                        <img
                                            src={child.coverUrl}
                                            alt={child.name}
                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black opacity-40 group-hover:opacity-60 transition-opacity" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />



                                    <div className="relative z-10">
                                        <p className="text-lg font-bold text-white drop-shadow-lg">{child.name}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Photos — only show if there are actual photos, OR if there are no children either */}
                {(hasPhotos || !hasChildren) && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-3">
                            Photography
                            <div className="h-[1px] flex-1 bg-zinc-800" />
                        </h2>

                        {!hasPhotos ? (
                            <div className="border border-dashed border-zinc-800 rounded-2xl p-20 text-center">
                                <p className="text-zinc-500 text-lg">No photos uploaded to this collection yet.</p>
                            </div>
                        ) : (
                            <PhotoGrid photos={validPhotos as any} isOwner={isOwner} />
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
