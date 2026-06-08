"use client";

import { useMemo, memo } from "react";
import Image from "next/image";
import { Photo } from "./PhotoGrid";

const TimelineView = memo(function TimelineView({ photos, onPhotoClick }: { photos: Photo[], onPhotoClick: (index: number) => void }) {
    // Group photos by Month-Year (using takenAt or uploadedAt fallback)
    const grouped = useMemo(() => {
        return photos.reduce((acc, photo, index) => {
            const dateStr = photo.takenAt || photo.uploadedAt;
            const date = new Date(dateStr);
            const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            if (!acc[key]) acc[key] = [];
            acc[key].push({ ...photo, originalIndex: index });
            return acc;
        }, {} as Record<string, (Photo & { originalIndex: number })[]>);
    }, [photos]);

    // Sort groups latest first
    const sortedKeys = useMemo(() => {
        return Object.keys(grouped).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        });
    }, [grouped]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in space-y-16">
            {sortedKeys.map(key => (
                <div key={key} className="relative">
                    {/* Month Line Marker */}
                    <div className="flex items-center gap-4 mb-6 sticky top-20 z-10 timeline-header py-2 backdrop-blur-md">
                        <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        <h2 className="text-2xl font-bold tracking-tight">{key}</h2>
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-white/20 to-transparent" />
                    </div>

                    <div className="pl-6 border-l border-white/10 ml-2 space-y-2">
                        {/* Horizontal scrolling strip for photos in this month */}
                        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x snap-mandatory">
                            {grouped[key].map(photo => (
                                <div 
                                    key={photo.id}
                                    onClick={() => onPhotoClick(photo.originalIndex)}
                                    className="relative flex-none w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden cursor-pointer snap-center group border border-white/5 hover:border-white/20 transition-all hover:scale-[1.02]"
                                >
                                    <Image 
                                        src={photo.thumbnailUrl} 
                                        alt={photo.filename} 
                                        fill
                                        className="object-cover transition duration-500 group-hover:scale-105"
                                        unoptimized
                                    />
                                    {photo.mediaType === 'video' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition">
                                            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                            </div>
                                        </div>
                                    )}
                                    {/* Date overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs font-bold text-white tracking-widest uppercase">
                                            {new Date(photo.takenAt || photo.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default TimelineView;
