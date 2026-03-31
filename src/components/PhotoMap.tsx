"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase">Loading Map...</p>
            </div>
        </div>
    )
});

export default function PhotoMap(props: { photos: any[], onMarkerClick?: (index: number) => void }) {
    return <MapComponent {...props} />;
}
