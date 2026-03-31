"use client";

import { useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const MapPinInner = dynamic(() => import("./MapPinInner"), { ssr: false });

export default function MapPinModal({ 
    photoId, 
    initialLat, 
    initialLng, 
    onClose, 
    onPinSaved 
}: { 
    photoId: string, 
    initialLat: number | null, 
    initialLng: number | null, 
    onClose: () => void,
    onPinSaved: (lat: number, lng: number) => void
}) {
    const [lat, setLat] = useState<number | null>(initialLat);
    const [lng, setLng] = useState<number | null>(initialLng);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!lat || !lng) {
            toast.error("Please select a location on the map first");
            return;
        }
        
        setSaving(true);
        try {
            const res = await fetch(`/api/photos/${photoId}/pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat, lng })
            });
            if (res.ok) {
                toast.success("Location pinned!");
                onPinSaved(lat, lng);
                onClose();
            } else {
                toast.error("Failed to pin location");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white">Pin Location</h2>
                        <p className="text-xs text-zinc-500">Click anywhere on the map to set or update the photo's location.</p>
                    </div>
                    <button onClick={onClose} disabled={saving} className="text-zinc-500 hover:text-white transition">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                
                <div className="flex-1 min-h-0 relative">
                    <MapPinInner lat={lat} lng={lng} onLocationSelect={(la, ln) => { setLat(la); setLng(ln); }} />
                </div>
                
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40 shrink-0">
                    <div className="text-xs text-zinc-400 font-mono">
                        {lat ? `${lat.toFixed(5)}, ${lng?.toFixed(5)}` : "No location selected"}
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={saving || !lat || !lng}
                        className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Pin"}
                    </button>
                </div>
            </div>
        </div>
    );
}
