"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const PhotoLightbox = dynamic(() => import("./PhotoLightbox"));
const MovePhotoModal = dynamic(() => import("./MovePhotoModal"));
const TimelineView = dynamic(() => import("./TimelineView"));
const PhotoMap = dynamic(() => import("./PhotoMap"));

const GRID_BATCH_SIZE = 60;

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface Photo {
    id: string;
    filename: string;
    fileSize: number;
    uploadedAt: string;
    thumbnailUrl: string;
    fullUrl?: string;
    r2Key: string;
    storageProvider: string;
    mediaType?: string;
    duration?: number | null;
    width?: number;
    height?: number;
    caption?: string | null;
    sortOrder?: number | null;
    liked: boolean;
    likeCount: number;
    lat?: number | null;
    lng?: number | null;
    takenAt?: string | null;
    albumId: string;
    isBlurred?: boolean;
    unlockPrice?: number | null;
}

interface PhotoGridProps {
    photos: Photo[];
    isOwner?: boolean;
}

export default function PhotoGrid({ photos: initialPhotos, isOwner }: PhotoGridProps) {
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [moveTarget, setMoveTarget] = useState<{ photoId: string; albumId: string } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'map'>('grid');
    const [visibleCount, setVisibleCount] = useState(GRID_BATCH_SIZE);

    const visiblePhotos = viewMode === 'grid' ? photos.slice(0, visibleCount) : photos;
    const photoIndexMap = useMemo(() => new Map(photos.map((photo, index) => [photo.id, index])), [photos]);

    const handleUnlock = async (photo: Photo) => {
        if (!confirm(`Unlock this custom content for $${photo.unlockPrice?.toFixed(2) || '0.00'}?`)) return;

        const promise = fetch(`/api/photos/${photo.id}/unlock`, { method: "POST" })
            .then(async res => {
                if (!res.ok) throw new Error("Failed to unlock");
                window.location.reload();
            });

        toast.promise(promise, {
            loading: "Processing payment...",
            success: "Photo unlocked! Refreshing page...",
            error: "Transaction failed."
        });
    };

    // Drag-to-reorder state
    const dragIndex = useRef<number | null>(null);

    const handleDragStart = (i: number) => { dragIndex.current = i; };

    const handleDrop = async (dropIndex: number) => {
        const from = dragIndex.current;
        if (from === null || from === dropIndex) return;

        const updated = [...photos];
        const [moved] = updated.splice(from, 1);
        updated.splice(dropIndex, 0, moved);

        // Assign sequential sortOrder
        const withOrder = updated.map((p, i) => ({ ...p, sortOrder: i }));
        setPhotos(withOrder);
        dragIndex.current = null;

        // Prepare bulk update payload
        const updates = withOrder.map(p => ({ id: p.id, sortOrder: p.sortOrder }));

        // Persist changed orders via bulk API
        const promise = fetch("/api/photos/bulk-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates }),
        }).then(async res => {
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save order");
            }
            return res.json();
        });

        toast.promise(promise, {
            loading: "Saving new order...",
            success: "Photo order saved.",
            error: (err) => `Failed to save order: ${err.message}`
        });
    };

    const handleDelete = async (photoId: string) => {
        if (!confirm("Are you sure you want to delete this photo? This cannot be undone.")) return;

        // Optimistic update
        const original = [...photos];
        setPhotos(prev => prev.filter(p => p.id !== photoId));

        try {
            const res = await fetch(`/api/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || "Delete failed");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(`Could not delete photo: ${err.message}`);
            setPhotos(original); // Revert
        }
    };

    const handleLightboxUpdate = (updatedPhoto: Photo) => {
        setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    };

    return (
        <div className="flex flex-col h-full w-full">
            {photos.length > 0 && (
                <div className="flex items-center justify-end mb-6 sticky top-20 z-40 pr-4 md:pr-8">
                    <div className="flex bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-2xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition ${viewMode === 'grid' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition ${viewMode === 'timeline' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition ${viewMode === 'map' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Map
                        </button>
                    </div>
                </div>
            )}

            {viewMode === 'grid' && (
                <>
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 px-4 md:px-8">
                        {visiblePhotos.map((photo, i) => {
                        const globalIndex = photoIndexMap.get(photo.id) ?? i;
                        return (
                        <div
                            key={photo.id}
                            className="group relative aspect-square rounded-xl overflow-hidden animate-in"
                            style={{ animationDelay: `${i * 20}ms` }}
                            draggable={isOwner}
                            onDragStart={() => handleDragStart(globalIndex)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(globalIndex)}
                        >
                            <button
                                onClick={() => {
                                    if (photo.isBlurred) {
                                        handleUnlock(photo);
                                    } else {
                                        setLightboxIndex(globalIndex);
                                    }
                                }}
                                className="w-full h-full focus:outline-none relative"
                            >
                                <img
                                    src={photo.thumbnailUrl}
                                    alt={photo.filename}
                                    className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${photo.isBlurred ? 'blur-2xl scale-125' : ''}`}
                                    loading={globalIndex < 8 ? "eager" : "lazy"}
                                    fetchPriority={globalIndex === 0 ? "high" : "auto"}
                                />
                                {!photo.isBlurred && (
                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                )}

                                {/* Blurred locked UI overlay */}
                                {photo.isBlurred && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors backdrop-blur-md">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 mb-3 group-hover:scale-110 transition-transform">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <span className="px-4 py-2 bg-white text-black rounded-full text-xs font-bold shadow-2xl group-hover:shadow-white/20 transition-all uppercase tracking-widest">
                                            Unlock for ${photo.unlockPrice?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                )}

                                {/* Video play icon overlay */}
                                {photo.mediaType === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                                                <polygon points="8,5 20,12 8,19" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {/* Video duration badge */}
                                {photo.mediaType === 'video' && photo.duration && (
                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white/80 pointer-events-none">
                                        {formatDuration(photo.duration)}
                                    </div>
                                )}
                            </button>

                            {/* Owner controls */}
                            {isOwner && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    {/* Delete button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                                        className="w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-red-400 hover:text-red-200 hover:bg-black/90 hover:border-red-400/50 transition"
                                        title="Delete photo"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" />
                                            <path d="M10 11v6" />
                                            <path d="M14 11v6" />
                                        </svg>
                                    </button>
                                    {/* Move button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); setMoveTarget({ photoId: photo.id, albumId: photo.albumId }); }}
                                        className="w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-black/90 transition"
                                        title="Move to album"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    {/* Drag handle */}
                                    <div
                                        className="w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-zinc-300 cursor-grab active:cursor-grabbing"
                                        title="Drag to reorder"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                            <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Like indicator on grid */}
                            {photo.likeCount > 0 && (
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                    <span className="text-[9px] text-white/70 font-bold">{photo.likeCount}</span>
                                </div>
                            )}
                        </div>
                    );
                    })}
                    </div>
                    {visibleCount < photos.length && (
                        <div className="px-4 md:px-8 mt-6 flex justify-center">
                            <button
                                onClick={() => setVisibleCount(current => Math.min(current + GRID_BATCH_SIZE, photos.length))}
                                className="px-5 py-2.5 rounded-full border border-white/15 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:border-white/35 transition"
                            >
                                Load more
                            </button>
                        </div>
                    )}
                </>
            )}

            {viewMode === 'timeline' && (
                <TimelineView photos={photos} onPhotoClick={setLightboxIndex} />
            )}

            {viewMode === 'map' && (
                <div className="flex-1 min-h-[60vh] rounded-2xl overflow-hidden mx-4 md:mx-8 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <PhotoMap photos={photos} onMarkerClick={setLightboxIndex} />
                </div>
            )}

            {lightboxIndex !== null && (
                <PhotoLightbox
                    photos={photos}
                    currentIndex={lightboxIndex}
                    isOwner={!!isOwner}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={i => setLightboxIndex(i)}
                    onPhotoUpdate={handleLightboxUpdate}
                />
            )}

            {moveTarget && (
                <MovePhotoModal
                    photoId={moveTarget.photoId}
                    currentAlbumId={moveTarget.albumId}
                    onClose={() => setMoveTarget(null)}
                />
            )}
        </div>
    );
}
