"use client";

import { useState } from "react";
import PhotoLightbox from "./PhotoLightbox";

interface Photo {
    id: string;
    filename: string;
    fileSize: number;
    uploadedAt: string;
    thumbnailUrl: string;
    fullUrl: string;
}

interface PhotoGridProps {
    photos: Photo[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {photos.map((photo, i) => (
                    <button
                        key={photo.id}
                        onClick={() => setLightboxIndex(i)}
                        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer animate-in focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                        style={{ animationDelay: `${i * 20}ms` }}
                    >
                        <img
                            src={photo.thumbnailUrl}
                            alt={photo.filename}
                            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                        />
                        {/* Subtle bottom gradient on hover for depth */}
                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                ))}
            </div>

            {lightboxIndex !== null && (
                <PhotoLightbox
                    photos={photos}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={(i) => setLightboxIndex(i)}
                />
            )}
        </>
    );
}
