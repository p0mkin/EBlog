/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import { getSession } from "@/lib/session";
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCachedAlbumByPath, getCachedAllPhotosRecursive } from '@/lib/db';
import { isOwner as checkIsOwner } from '@/lib/auth-utils';

const UploadModal = dynamic(() => import('@/components/UploadModal'));
const PhotoGrid = dynamic(() => import('@/components/PhotoGrid'));
const CreateAlbumButton = dynamic(() => import('@/components/CreateAlbumButton'));
const AlbumActionsMenu = dynamic(() => import('@/components/AlbumActionsMenu'));

interface PageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<{ showArchived?: string }>;
}

export default async function AlbumPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    if (slug && slug[0] === 'vault') {
        notFound();
    }
    const { showArchived } = await searchParams;
    const isArchivedView = showArchived === 'true';
    const session = await getSession();
    const isOwner = checkIsOwner(session);

    // Cached: album tree resolution + photos + children covers (60s TTL)
    const currentAlbum = await getCachedAlbumByPath(slug, isOwner, isArchivedView, session?.user?.email || null);
    if (!currentAlbum) notFound();

    const hasDirectPermission = isOwner || currentAlbum.permissions.some((p: any) => p.user?.email === session?.user?.email);

    // Check role-based access if no direct permission
    let isPayAsYouGoOnly = false;
    let paygPreviewCount = 0;
    let hasPermission = hasDirectPermission;

    if (!hasPermission && session?.user?.email) {
        const accessibleRoles = await prisma.roleAlbumAccess.findMany({
            where: {
                albumId: currentAlbum.id,
                role: {
                    OR: [
                        { assignments: { some: { user: { email: session.user.email }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } as any } },
                        { name: 'viewer' }, // All authenticated users are implicit viewers
                    ],
                },
            },
            include: { role: true }
        });

        if (accessibleRoles.length > 0) {
            hasPermission = true;
            const hasFullAccessRole = (accessibleRoles as any[]).some(ra => !ra.role.isPayAsYouGo);
            if (!hasFullAccessRole) {
                isPayAsYouGoOnly = true;
                paygPreviewCount = (accessibleRoles as any[])[0].role.blurPreviewCount || 3;
            }
        }
    }
    if (!hasPermission) redirect('/gallery');

    // Get current user's DB id for like checks (lightweight query, not cached)
    let currentUserId: string | null = null;
    if (session?.user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
        currentUserId = dbUser?.id ?? null;
    }

    // If Pay-As-You-Go, fetch unlocks.
    let userUnlocks = new Set<string>();
    if (isPayAsYouGoOnly && currentUserId) {
        const unlocks = await (prisma as any).photoUnlock.findMany({
            where: { userId: currentUserId, photoId: { in: currentAlbum.photos.map((p: any) => p.id) } },
            select: { photoId: true }
        });
        unlocks.forEach((u: { photoId: string }) => userUnlocks.add(u.photoId));
    }

    let lockedCount = 0;

    // Build photo data — NO per-photo signed URL generation during SSR.
    // Oracle photos get public URLs synchronously; R2 photos defer to client-side.
    const photosForGrid = currentAlbum.photos.map((photo: any) => {
        try {
            const isOracle = photo.storageProvider === 'oracle';
            let fullUrl = undefined; // Defer to client-side for both R2 and Oracle private signed URLs
            const likeCount = photo.likes?.length ?? 0;
            const liked = currentUserId ? photo.likes?.some((l: any) => l.userId === currentUserId) : false;

            let isBlurred = false;
            let displayUnlockPrice = photo.unlockPrice ?? null;
            let redactedR2Key = photo.r2Key;

            if (isPayAsYouGoOnly && !userUnlocks.has(photo.id)) {
                if (lockedCount >= paygPreviewCount) return null; // Drop from response entirely
                lockedCount++;
                isBlurred = true;
                fullUrl = undefined;
                redactedR2Key = "REDACTED";

                // Fallback to role global price if photo doesn't have individual price
                if (displayUnlockPrice === null) {
                    const paygRolePrice = currentAlbum.roleAccess?.find((r: any) => r.role?.isPayAsYouGo)?.role?.photoUnlockPrice;
                    displayUnlockPrice = paygRolePrice ?? 0;
                }
            }

            // Cryptographically sign the thumbnail parameters to prevent users from manually modifying '&blur=true' in the URL
            const sig = createHmac('sha256', process.env.NEXTAUTH_SECRET || "fallback").update(`${photo.id}_${isBlurred}`).digest('hex');
            const thumbnailUrl = `/api/photos/thumbnail?id=${photo.id}&w=400&v=2&blur=${isBlurred}&sig=${sig}`;

            return {
                id: photo.id,
                albumId: currentAlbum.id,
                filename: photo.filename,
                fileSize: photo.fileSize,
                uploadedAt: photo.uploadedAt || '',
                thumbnailUrl,
                fullUrl,
                r2Key: redactedR2Key, // Ensure it's redacted if locked
                storageProvider: photo.storageProvider || 'r2',
                mediaType: photo.mediaType || 'image',
                duration: photo.duration ?? null,
                width: photo.width,
                height: photo.height,
                caption: photo.caption ?? null,
                sortOrder: photo.sortOrder ?? null,
                liked,
                likeCount,
                isBlurred,
                unlockPrice: displayUnlockPrice,
            };
        } catch { return null; }
    });
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
    const hasVideos = validPhotos.some((p: any) => p?.mediaType === 'video');
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
                    <div className="flex items-center gap-3 shrink-0">
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
                                    className="group relative flex flex-col justify-end aspect-[4/3] rounded-2xl p-6 glass-card overflow-hidden transition-all duration-500"
                                >
                                    {child.coverUrl ? (
                                        <Image
                                            src={child.coverUrl}
                                            alt={child.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
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
                            {hasVideos ? 'Media' : 'Photography'}
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
