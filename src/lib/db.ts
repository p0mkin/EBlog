import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// ─── Gallery Page: Albums with cover photos ─────────────────────────
export const getCachedAlbums = unstable_cache(
    async (isOwner: boolean, isArchivedView: boolean, userEmail: string | null) => {
        const albums = await prisma.album.findMany({
            where: {
                parentId: null,
                visibility: isOwner
                    ? (isArchivedView ? 'archived' : { not: 'archived' })
                    : { not: 'archived' },
                OR: isOwner ? undefined : [
                    { visibility: 'public' },
                    { permissions: { some: { user: { email: userEmail || '' } } } }
                ]
            },
            orderBy: { name: 'asc' },
        });

        // Batch-load cover photos: collect all coverPhotoIds + album IDs for fallback
        const coverPhotoIds = albums
            .map(a => a.coverPhotoId)
            .filter((id): id is string => !!id);

        const explicitCovers = coverPhotoIds.length > 0
            ? await prisma.photo.findMany({
                where: { id: { in: coverPhotoIds } },
                select: { id: true, r2Key: true },
            })
            : [];

        const coverMap = new Map(explicitCovers.map(p => [p.id, p.r2Key]));

        // For albums without explicit covers, find the first photo
        const albumsNeedingFallback = albums.filter(a => !a.coverPhotoId || !coverMap.has(a.coverPhotoId));
        const fallbackCovers = albumsNeedingFallback.length > 0
            ? await prisma.photo.findMany({
                where: {
                    album: {
                        OR: albumsNeedingFallback.flatMap(a => [
                            { id: a.id },
                            { parentId: a.id },
                        ])
                    },
                    visibility: { not: "hidden" },
                },
                orderBy: { uploadedAt: 'asc' },
                select: { albumId: true, r2Key: true, album: { select: { parentId: true } } },
            })
            : [];

        // Map each album to its first fallback photo
        const fallbackMap = new Map<string, string>();
        for (const photo of fallbackCovers) {
            // The album that "owns" this fallback is either the photo's direct album or its parent
            const ownerAlbumId = photo.album.parentId
                ? (albumsNeedingFallback.find(a => a.id === photo.album.parentId) ? photo.album.parentId : photo.albumId)
                : photo.albumId;
            if (!fallbackMap.has(ownerAlbumId)) {
                fallbackMap.set(ownerAlbumId, photo.r2Key);
            }
        }

        return albums.map(album => {
            let coverUrl: string | null = null;
            if (album.coverPhotoId && coverMap.has(album.coverPhotoId)) {
                coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(coverMap.get(album.coverPhotoId)!)}&w=600&v=2`;
            } else if (fallbackMap.has(album.id)) {
                coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(fallbackMap.get(album.id)!)}&w=600&v=2`;
            }
            return { ...album, coverUrl, createdAt: album.createdAt.toISOString() };
        });
    },
    ['albums-list'],
    { revalidate: 60, tags: ['albums', 'photos'] }
);

// ─── Thumbnail: Provider lookup ─────────────────────────────────────
export const getCachedPhotoProvider = unstable_cache(
    async (r2Key: string) => {
        const photo = await prisma.photo.findFirst({
            where: { r2Key },
            select: { storageProvider: true },
        });
        return photo?.storageProvider ?? 'r2';
    },
    ['photo-provider'],
    { revalidate: 300, tags: ['photos'] }
);

// ─── Albums flat list (for move dialog / admin) ─────────────────────
export const getCachedAllAlbums = unstable_cache(
    async () => {
        return prisma.album.findMany({
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, slug: true, parentId: true },
        });
    },
    ['all-albums-flat'],
    { revalidate: 60, tags: ['albums'] }
);

// ─── Admin: Albums flat list (same data, shared cache) ──────────────
export const getCachedAdminAlbums = unstable_cache(
    async () => {
        return prisma.album.findMany({
            select: { id: true, name: true, slug: true, parentId: true },
            orderBy: { name: 'asc' },
        });
    },
    ['admin-albums-flat'],
    { revalidate: 60, tags: ['albums'] }
);

// ─── Admin: Roles with assignments and album access ─────────────────
export const getCachedRoles = unstable_cache(
    async () => {
        // Ensure viewer role exists
        let viewer = await prisma.role.findUnique({ where: { name: 'viewer' } });
        if (!viewer) {
            viewer = await prisma.role.create({
                data: { name: 'viewer', color: '#71717a' },
            });
        }

        const roles = await prisma.role.findMany({
            include: {
                assignments: { include: { user: true } },
                albumAccess: { include: { album: true } },
                exclusions: { include: { photo: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Serialize dates for caching
        return roles.map(role => ({
            ...role,
            createdAt: role.createdAt.toISOString(),
            assignments: role.assignments.map(a => ({
                ...a,
                user: { ...a.user, createdAt: a.user.createdAt.toISOString() },
            })),
            albumAccess: role.albumAccess.map(a => ({
                ...a,
                album: { ...a.album, createdAt: a.album.createdAt.toISOString() },
            })),
            exclusions: role.exclusions.map(e => ({
                ...e,
                photo: {
                    ...e.photo,
                    uploadedAt: e.photo.uploadedAt.toISOString(),
                    takenAt: e.photo.takenAt?.toISOString() ?? null,
                },
            })),
        }));
    },
    ['admin-roles'],
    { revalidate: 60, tags: ['roles'] }
);

// ─── Album Slug Page: Resolve album by path + load data ─────────────
export const getCachedAlbumByPath = unstable_cache(
    async (slugPath: string[], isOwner: boolean, isArchivedView: boolean) => {
        let currentAlbum: any = null;

        for (const part of slugPath) {
            currentAlbum = await prisma.album.findFirst({
                where: { parentId: currentAlbum?.id || null, slug: part },
                include: {
                    children: {
                        where: isOwner
                            ? (isArchivedView ? { visibility: 'archived' } : { visibility: { not: 'archived' } })
                            : { visibility: 'public' },
                        orderBy: { name: 'asc' },
                    },
                    photos: {
                        where: { visibility: { not: 'hidden' } },
                        orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }],
                        select: {
                            id: true, filename: true, r2Key: true, fileSize: true,
                            width: true, height: true, uploadedAt: true,
                            storageProvider: true, caption: true, sortOrder: true,
                            likes: { select: { userId: true } },
                        },
                    },
                    permissions: { include: { user: true } },
                },
            });
            if (!currentAlbum) return null;
        }

        if (!currentAlbum) return null;

        // Batch-load child album covers
        const childCoverPhotoIds = currentAlbum.children
            .map((c: any) => c.coverPhotoId)
            .filter((id: string | null): id is string => !!id);

        const explicitCovers = childCoverPhotoIds.length > 0
            ? await prisma.photo.findMany({
                where: { id: { in: childCoverPhotoIds } },
                select: { id: true, r2Key: true },
            })
            : [];

        const coverMap = new Map(explicitCovers.map((p: any) => [p.id, p.r2Key]));

        // Fallback covers for children without explicit covers
        const childrenNeedingFallback = currentAlbum.children.filter(
            (c: any) => !c.coverPhotoId || !coverMap.has(c.coverPhotoId)
        );

        const fallbackCovers = childrenNeedingFallback.length > 0
            ? await prisma.photo.findMany({
                where: {
                    album: {
                        OR: childrenNeedingFallback.flatMap((c: any) => [
                            { id: c.id },
                            { parentId: c.id },
                        ]),
                    },
                },
                orderBy: { uploadedAt: 'asc' },
                select: { albumId: true, r2Key: true, album: { select: { parentId: true } } },
            })
            : [];

        const fallbackMap = new Map<string, string>();
        for (const photo of fallbackCovers) {
            const ownerAlbumId = photo.album.parentId
                ? (childrenNeedingFallback.find((c: any) => c.id === photo.album.parentId) ? photo.album.parentId : photo.albumId)
                : photo.albumId;
            if (!fallbackMap.has(ownerAlbumId)) {
                fallbackMap.set(ownerAlbumId, photo.r2Key);
            }
        }

        const childAlbumsWithCovers = currentAlbum.children.map((child: any) => {
            let coverUrl: string | null = null;
            if (child.coverPhotoId && coverMap.has(child.coverPhotoId)) {
                coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(coverMap.get(child.coverPhotoId)!)}&w=400&v=2`;
            } else if (fallbackMap.has(child.id)) {
                coverUrl = `/api/photos/thumbnail?key=${encodeURIComponent(fallbackMap.get(child.id)!)}&w=400&v=2`;
            }
            return {
                ...child,
                coverUrl,
                createdAt: child.createdAt.toISOString(),
            };
        });

        // Serialize dates
        const serializedPhotos = currentAlbum.photos.map((p: any) => ({
            ...p,
            uploadedAt: p.uploadedAt?.toISOString() || '',
        }));

        const serializedPermissions = currentAlbum.permissions.map((p: any) => ({
            ...p,
            user: p.user ? { ...p.user, createdAt: p.user.createdAt.toISOString() } : null,
        }));

        return {
            ...currentAlbum,
            createdAt: currentAlbum.createdAt.toISOString(),
            photos: serializedPhotos,
            permissions: serializedPermissions,
            children: childAlbumsWithCovers,
        };
    },
    ['album-by-path'],
    { revalidate: 60, tags: ['albums', 'photos'] }
);

// ─── Recursive photo collection for cover picker ────────────────────
export const getCachedAllPhotosRecursive = unstable_cache(
    async (albumId: string) => {
        async function collect(id: string): Promise<{ id: string; filename: string; r2Key: string }[]> {
            const album = await prisma.album.findUnique({
                where: { id },
                include: {
                    photos: {
                        where: { visibility: { not: 'hidden' } },
                        select: { id: true, filename: true, r2Key: true },
                    },
                    children: { select: { id: true } },
                },
            });
            if (!album) return [];
            let all = [...album.photos];
            for (const child of album.children) {
                all = all.concat(await collect(child.id));
            }
            return all;
        }
        return collect(albumId);
    },
    ['all-photos-recursive'],
    { revalidate: 60, tags: ['albums', 'photos'] }
);
