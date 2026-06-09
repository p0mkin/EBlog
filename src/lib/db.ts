import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// ─── Gallery Page: Albums with cover photos ─────────────────────────
export const getCachedAlbums = (isOwner: boolean, isArchivedView: boolean, userEmail: string | null) => unstable_cache(
    async () => {
        const albums = await prisma.album.findMany({
            where: {
                parentId: null,
                slug: { not: 'vault' },
                visibility: isOwner
                    ? (isArchivedView ? 'archived' : { not: 'archived' })
                    : { not: 'archived' },
                OR: isOwner ? undefined : [
                    { visibility: 'public' },
                    { permissions: { some: { user: { email: userEmail || '' } } } },
                    { roleAccess: { some: { role: { assignments: { some: { user: { email: userEmail || '' }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } as any } } } } },
                    // Viewer role is implicit for all authenticated users
                    ...(userEmail ? [{ roleAccess: { some: { role: { name: 'viewer' } } } }] : []),
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
                distinct: ['albumId'],
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
    ['albums-list', String(isOwner), String(isArchivedView), userEmail || 'guest'],
    { revalidate: 60, tags: ['albums', 'photos'] }
)();

// ─── Thumbnail: Provider lookup ─────────────────────────────────────
export const getCachedPhotoProvider = (r2Key: string) => unstable_cache(
    async () => {
        const photo = await prisma.photo.findFirst({
            where: { r2Key },
            select: { storageProvider: true },
        });
        return photo?.storageProvider ?? 'r2';
    },
    ['photo-provider', r2Key],
    { revalidate: 300, tags: ['photos'] }
)();

// ─── Albums flat list (for move dialog / admin) ─────────────────────
export const getCachedAllAlbums = unstable_cache(
    async () => {
        return prisma.album.findMany({
            where: { slug: { not: 'vault' } },
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
            where: { slug: { not: 'vault' } },
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
                expiresAt: (a as any).expiresAt ? (a as any).expiresAt.toISOString() : null,
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

// ─── User's display role (for badge) ────────────────────────────────
export const getCachedUserRole = (userEmail: string) => unstable_cache(
    async () => {
        // Find the user's role assignments, prefer non-viewer roles that are active
        const assignment = await (prisma as any).roleAssignment.findFirst({
            where: {
                user: { email: userEmail.toLowerCase() },
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
            },
            include: { role: { select: { name: true, color: true } } },
            orderBy: { role: { name: 'asc' } },
        });

        if (assignment) {
            return { name: assignment.role.name, color: assignment.role.color };
        }

        // Fallback: check the user's direct role field
        const user = await prisma.user.findUnique({
            where: { email: userEmail.toLowerCase() },
            select: { role: true },
        });

        return user ? { name: user.role, color: '#71717a' } : null;
    },
    ['user-role', userEmail],
    { revalidate: 60, tags: ['roles'] }
)();

// ─── Album Slug Page: Resolve album by path + load data ─────────────
export const getCachedAlbumByPath = (slugPath: string[], isOwner: boolean, isArchivedView: boolean, userEmail: string | null) => unstable_cache(
    async () => {
        // Resolve target album ID using lightweight iterative queries to avoid N+1 heavy payloads
        let targetId: string | null = null;
        for (const part of slugPath) {
            const currentPartAlbum: any = await prisma.album.findFirst({
                where: { parentId: targetId, slug: part },
                select: { id: true }
            });
            if (!currentPartAlbum) return null;
            targetId = currentPartAlbum.id;
        }

        if (!targetId) return null;

        const currentAlbum = await prisma.album.findUnique({
            where: { id: targetId },
            include: {
                children: {
                    where: isOwner
                        ? (isArchivedView ? { visibility: 'archived' } : { visibility: { not: 'archived' } })
                        : {
                            OR: [
                                { visibility: 'public' },
                                { roleAccess: { some: { role: { assignments: { some: { user: { email: userEmail || '' }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } as any } } } } },
                                // Viewer role is implicit for all authenticated users
                                ...(userEmail ? [{ roleAccess: { some: { role: { name: 'viewer' } } } }] : []),
                            ],
                        },
                    orderBy: { name: 'asc' },
                },
                photos: {
                    where: { visibility: { not: 'hidden' } },
                    orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }],
                    select: {
                        id: true, filename: true, r2Key: true, fileSize: true,
                        width: true, height: true, uploadedAt: true,
                        storageProvider: true, caption: true, sortOrder: true,
                        mediaType: true, duration: true,
                        likes: { select: { userId: true } },
                    },
                },
                permissions: { include: { user: true } },
                roleAccess: { include: { role: true } },
            },
        });

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
                distinct: ['albumId'],
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
    ['album-by-path', slugPath.join('/'), String(isOwner), String(isArchivedView), userEmail || 'guest'],
    { revalidate: 60, tags: ['albums', 'photos'] }
)();

// ─── Recursive photo collection for cover picker ────────────────────
export const getCachedAllPhotosRecursive = (albumId: string) => unstable_cache(
    async () => {
        const allAlbums = await prisma.album.findMany({ select: { id: true, parentId: true } });
        const albumMap = new Map<string, string[]>();
        for (const album of allAlbums) {
            if (album.parentId) {
                const children = albumMap.get(album.parentId) || [];
                children.push(album.id);
                albumMap.set(album.parentId, children);
            }
        }

        const ids: string[] = [albumId];
        const queue = [...(albumMap.get(albumId) || [])];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            ids.push(currentId);
            const children = albumMap.get(currentId) || [];
            queue.push(...children);
        }

        return prisma.photo.findMany({
            where: {
                albumId: { in: ids },
                visibility: { not: 'hidden' }
            },
            select: { id: true, filename: true, r2Key: true },
            orderBy: [{ uploadedAt: 'desc' }]
        });
    },
    ['all-photos-recursive', albumId],
    { revalidate: 60, tags: ['albums', 'photos'] }
)();
