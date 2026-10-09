// ✅ FIX: DB-side "first photo per album-or-its-children" resolution.
// Old approach: fetch EVERY photo belonging to albums-needing-fallback
// (+ their direct children), order by uploadedAt, then discard all but
// the first per album in a JS loop. An album with 500 photos pulled
// 500 rows across the wire just to use 1.
// New approach: a single query resolves ownership (direct album vs.
// parent) via CASE, then DISTINCT ON (ownerAlbumId) lets Postgres hand
// back exactly one row per album — zero waste.
async function getFirstPhotoPerAlbumOrChildren(
    albumIds: string[]
): Promise<Map<string, string>> {
    if (albumIds.length === 0) return new Map();

    const rows = await prisma.$queryRaw<{ ownerAlbumId: string; r2Key: string }[]>`
        SELECT DISTINCT ON (owner."ownerAlbumId")
            owner."ownerAlbumId", p."r2Key"
        FROM "Photo" p
        JOIN "Album" a ON a.id = p."albumId"
        JOIN LATERAL (
            SELECT CASE
                WHEN a.id = ANY(${albumIds}::text[]) THEN a.id
                ELSE a."parentId"
            END AS "ownerAlbumId"
        ) owner ON owner."ownerAlbumId" = ANY(${albumIds}::text[])
        WHERE p."visibility" != 'hidden'
        ORDER BY owner."ownerAlbumId", p."uploadedAt" ASC
    `;

    return new Map(rows.map(r => [r.ownerAlbumId, r.r2Key]));
}

// ─── Gallery Page: Albums with cover photos ─────────────────────────
// ✅ FIX: Cache key no longer includes userEmail — the base query result
// (albums + permissions + roleAccess relations) is identical for everyone.
// Per-user visibility is now a cheap in-memory filter applied after the
// cache hit, so this is a SHARED cache across all visitors.
const getCachedAlbumsBase = (isOwner: boolean, isArchivedView: boolean) => unstable_cache(
    async () => {
        const albums = await prisma.album.findMany({
            where: {
                parentId: null,
                slug: { not: 'vault' },
                visibility: isOwner
                    ? (isArchivedView ? 'archived' : { not: 'archived' })
                    : { not: 'archived' },
            },
            include: {
                permissions: { select: { user: { select: { email: true } } } },
                roleAccess: {
                    select: {
                        role: {
                            select: {
                                name: true,
                                assignments: { select: { userId: true, expiresAt: true, user: { select: { email: true } } } },
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        const coverPhotoIds = albums.map(a => a.coverPhotoId).filter((id): id is string => !!id);
        const explicitCovers = coverPhotoIds.length > 0
            ? await prisma.photo.findMany({ where: { id: { in: coverPhotoIds } }, select: { id: true, r2Key: true } })
            : [];
        const coverMap = new Map(explicitCovers.map(p => [p.id, p.r2Key]));

        // ✅ FIX: single DB-side query instead of fetch-all-then-discard
        const albumsNeedingFallback = albums.filter(a => !a.coverPhotoId || !coverMap.has(a.coverPhotoId));
        const fallbackMap = await getFirstPhotoPerAlbumOrChildren(albumsNeedingFallback.map(a => a.id));

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
    ['albums-list', String(isOwner), String(isArchivedView)], // ✅ shared key, no userEmail
    { revalidate: 60, tags: ['albums', 'photos'] }
)();

/** Public wrapper: applies per-user permission filtering AFTER the shared cache hit. */
export async function getCachedAlbums(isOwner: boolean, isArchivedView: boolean, userEmail: string | null) {
    const albums = await getCachedAlbumsBase(isOwner, isArchivedView);
    if (isOwner) return albums.map(({ permissions, roleAccess, ...rest }: any) => rest);

    const now = new Date();
    return albums
        .filter((a: any) => {
            if (a.visibility === 'public') return true;
            if (a.permissions.some((p: any) => p.user?.email === userEmail)) return true;
            // ✅ BUGFIX: previous `if (userEmail) return true` granted every
            // logged-in user access to EVERY private album regardless of role —
            // a privilege-escalation bug. Restored original scoping: implicit
            // viewer access only applies when the album's roleAccess includes
            // a role literally named 'viewer', same as the pre-cache-refactor logic.
            const hasImplicitViewerAccess = userEmail && a.roleAccess.some((ra: any) => ra.role.name === 'viewer');
            if (hasImplicitViewerAccess) return true;
            return a.roleAccess.some((ra: any) =>
                ra.role.assignments.some((asn: any) =>
                    asn.user?.email === userEmail && (!asn.expiresAt || asn.expiresAt > now)
                )
            );
        })
        .map(({ permissions, roleAccess, ...rest }: any) => rest);
}

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
export const getCachedAlbumByPathBase = (slugPath: string[], isOwner: boolean, isArchivedView: boolean) => unstable_cache(
    async () => {
        let currentAlbum: any = null;

        for (const part of slugPath) {
            currentAlbum = await prisma.album.findFirst({
                where: { parentId: currentAlbum?.id || null, slug: part },
                include: {
                    // ✅ FIX: children query no longer filters by userEmail — fetch the
                    // superset (all non-archived children) and include roleAccess +
                    // assignments so permission filtering happens in-memory per-request
                    // against this ONE shared cached result, instead of baking the
                    // visitor's email into both the cache key AND the SQL WHERE clause.
                    children: {
                        where: isOwner
                            ? (isArchivedView ? { visibility: 'archived' } : { visibility: { not: 'archived' } })
                            : { visibility: { not: 'archived' } },
                        include: {
                            roleAccess: {
                                select: {
                                    role: {
                                        select: {
                                            name: true,
                                            assignments: {
                                                select: { expiresAt: true, user: { select: { email: true } } },
                                            },
                                        },
                                    },
                                },
                            },
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

        // ✅ FIX: single DB-side query instead of fetch-all-then-discard
        const fallbackMap = await getFirstPhotoPerAlbumOrChildren(
            childrenNeedingFallback.map((c: any) => c.id)
        );

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
    ['album-by-path', slugPath.join('/'), String(isOwner), String(isArchivedView)], // ✅ shared key, no userEmail
    { revalidate: 60, tags: ['albums', 'photos'] }
)();

/** Public wrapper: applies per-user child-visibility filtering AFTER the shared cache hit. */
export async function getCachedAlbumByPath(slugPath: string[], isOwner: boolean, isArchivedView: boolean, userEmail: string | null) {
    const album = await getCachedAlbumByPathBase(slugPath, isOwner, isArchivedView);
    if (!album) return null;
    if (isOwner) return album;

    const now = new Date();
    const visibleChildren = album.children.filter((c: any) => {
        if (c.visibility === 'public') return true;
        // Implicit viewer access only applies when roleAccess includes a role named 'viewer'
        const hasImplicitViewerAccess = userEmail && c.roleAccess?.some((ra: any) => ra.role.name === 'viewer');
        if (hasImplicitViewerAccess) return true;
        return c.roleAccess?.some((ra: any) =>
            ra.role.assignments.some((asn: any) =>
                asn.user?.email === userEmail && (!asn.expiresAt || asn.expiresAt > now)
            )
        );
    }).map(({ roleAccess, ...rest }: any) => rest);

    return { ...album, children: visibleChildren };
}

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
