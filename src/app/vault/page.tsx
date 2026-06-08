/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from "@/lib/session";
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isOwner as checkIsOwner } from '@/lib/auth-utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const UploadModal = dynamic(() => import('@/components/UploadModal'));
const PhotoGrid = dynamic(() => import('@/components/PhotoGrid'));

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function VaultPage() {
    const session = await getSession();
    const isOwner = checkIsOwner(session);

    if (!isOwner) {
        redirect('/');
    }

    // Ensure the Secure Vault album exists
    let vaultAlbum = await prisma.album.findFirst({
        where: { slug: "vault" },
        include: {
            photos: {
                where: { visibility: { not: 'hidden' } },
                orderBy: { uploadedAt: "desc" },
                select: {
                    id: true, filename: true, r2Key: true, fileSize: true,
                    width: true, height: true, uploadedAt: true,
                    storageProvider: true, caption: true, sortOrder: true,
                    mediaType: true, duration: true,
                },
            }
        }
    });

    if (!vaultAlbum) {
        vaultAlbum = await prisma.album.create({
            data: {
                name: "Secure Vault",
                slug: "vault",
                visibility: "private"
            },
            include: {
                photos: {
                    where: { visibility: { not: 'hidden' } },
                    orderBy: { uploadedAt: "desc" },
                    select: {
                        id: true, filename: true, r2Key: true, fileSize: true,
                        width: true, height: true, uploadedAt: true,
                        storageProvider: true, caption: true, sortOrder: true,
                        mediaType: true, duration: true,
                    },
                }
            }
        });
    }

    // Serialize dates for Client components
    const photosForGrid = vaultAlbum.photos.map((photo: any) => ({
        id: photo.id,
        albumId: vaultAlbum.id,
        filename: photo.filename,
        fileSize: photo.fileSize,
        uploadedAt: photo.uploadedAt?.toISOString() || '',
        thumbnailUrl: `/api/photos/thumbnail?id=${photo.id}&w=400&v=2`,
        fullUrl: undefined,
        r2Key: photo.r2Key,
        storageProvider: photo.storageProvider || 'r2',
        mediaType: photo.mediaType || 'file',
        duration: photo.duration ?? null,
        width: photo.width,
        height: photo.height,
        caption: photo.caption ?? null,
        sortOrder: photo.sortOrder ?? null,
        liked: false,
        likeCount: 0,
        isBlurred: false,
        unlockPrice: null,
    }));

    // Calculate Statistics
    const totalFiles = vaultAlbum.photos.length;
    const totalBytes = vaultAlbum.photos.reduce((sum, p) => sum + Number(p.fileSize), 0);
    const storageText = formatBytes(totalBytes);

    // Categories breakdown
    let archivesCount = 0;
    let docsCount = 0;

    const archiveExts = ['zip', 'rar', 'tar', 'gz', '7z'];
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md'];

    vaultAlbum.photos.forEach(photo => {
        const ext = photo.filename.split('.').pop()?.toLowerCase() || '';
        if (archiveExts.includes(ext)) {
            archivesCount++;
        } else if (docExts.includes(ext)) {
            docsCount++;
        }
    });

    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in duration-500">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 text-zinc-500 mb-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Secure Vault Area</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight premium-gradient-text mb-2">
                        Secure Vault
                    </h1>
                    <p className="text-zinc-500 text-sm max-w-lg">
                        An isolated administrative sanctuary for storing, archiving, and managing proprietary assets. Completely hidden from indexers and public catalogs.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/gallery" className="h-10 px-5 text-xs font-bold uppercase tracking-widest rounded-full border border-white/10 glass-card text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition duration-300">
                        Back to Gallery
                    </Link>
                    <UploadModal albumId={vaultAlbum.id} />
                </div>
            </div>

            {/* Statistics Section */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
                <div className="p-6 rounded-2xl glass-card border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Total Files</span>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-white tracking-tight">{totalFiles}</p>
                        <p className="text-xs text-zinc-600 mt-1">Stored securely</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl glass-card border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Total Volume</span>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-white tracking-tight">{storageText}</p>
                        <p className="text-xs text-zinc-600 mt-1">Storage allocated</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl glass-card border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Archives</span>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-amber-500 tracking-tight">{archivesCount}</p>
                        <p className="text-xs text-zinc-600 mt-1">Zips, RARs &amp; Tarballs</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl glass-card border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Documents</span>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-blue-500 tracking-tight">{docsCount}</p>
                        <p className="text-xs text-zinc-600 mt-1">PDFs, Sheets &amp; Docs</p>
                    </div>
                </div>
            </div>

            {/* Secure Files Listing Grid */}
            <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-3">
                    Encrypted Contents
                    <div className="h-[1px] flex-1 bg-zinc-800" />
                </h2>

                {totalFiles === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-2xl p-20 text-center bg-white/[0.01]">
                        <p className="text-zinc-500 text-lg">Your Secure Vault is currently empty.</p>
                        <p className="text-sm text-zinc-600 mt-2">Upload any file type using the &quot;Add Media&quot; toolbar button above.</p>
                    </div>
                ) : (
                    <PhotoGrid photos={photosForGrid} isOwner={isOwner} />
                )}
            </section>
        </div>
    );
}
