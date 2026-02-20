"use client";

import { useState, useRef } from "react";
import PhotoLightbox from "./PhotoLightbox";
import MovePhotoModal from "./MovePhotoModal";

export interface Photo {
    id: string;
    filename: string;
    fileSize: number;
    uploadedAt: string;
    thumbnailUrl: string;
    fullUrl: string;
    width?: number;
    height?: number;
    caption?: string | null;
    sortOrder?: number | null;
    liked: boolean;
    likeCount: number;
    albumId: string;
}

interface PhotoGridProps {
    photos: Photo[];
    isOwner?: boolean;
}

export default function PhotoGrid({ photos: initialPhotos, isOwner }: PhotoGridProps) {
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [moveTarget, setMoveTarget] = useState<{ photoId: string; albumId: string } | null>(null);

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

        // Persist changed orders
        await Promise.all(
            withOrder.map(p =>
                fetch(`/api/photos/${encodeURIComponent(p.id)}/order`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sortOrder: p.sortOrder }),
                })
            )
        );
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
            alert(`Could not delete photo: ${err.message}`);
            setPhotos(original); // Revert
        }
    };

    const handleLightboxUpdate = (updatedPhoto: Photo) => {
        setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    };

    return (
        <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {photos.map((photo, i) => (
                    <div
                        key={photo.id}
                        className="group relative aspect-square rounded-xl overflow-hidden animate-in"
                        style={{ animationDelay: `${i * 20}ms` }}
                        draggable={isOwner}
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDrop(i)}
                    >
                        <button
                            onClick={() => setLightboxIndex(i)}
                            className="w-full h-full focus:outline-none"
                        >
                            <img
                                src={photo.thumbnailUrl}
                                alt={photo.filename}
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                ))}
            </div>

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
        </>
    );
}
