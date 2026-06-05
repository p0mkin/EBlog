"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Need to import leafet marker images because webpack doesn't always bundle them correctly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon path issues with packing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
});

interface PhotoMapProps {
    photos: any[];
    onMarkerClick?: (index: number) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] !== 0 && center[1] !== 0) {
            map.flyTo(center, map.getZoom() || 4);
        }
    }, [center, map]);
    return null;
}

export default function MapComponent({ photos, onMarkerClick }: PhotoMapProps) {
    const validPhotos = photos.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    
    // Default center to world or the first valid photo
    const center: [number, number] = validPhotos.length > 0
        ? [validPhotos[0].lat, validPhotos[0].lng]
        : [20, 0];

    return (
        <MapContainer 
            center={center} 
            zoom={3} 
            className="flex-1 w-full min-h-[60vh] z-0"
            style={{ background: '#0a0a0a' }}
            scrollWheelZoom={true}
        >
            {/* Using a dark themed tile layer */}
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {validPhotos.length > 0 && <MapUpdater center={center} />}
            
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
            >
                {photos.map((photo, index) => {
                    if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number') return null;
                    return (
                        <Marker 
                            key={photo.id} 
                            position={[photo.lat, photo.lng]}
                            eventHandlers={{
                                click: () => {
                                    if (onMarkerClick) onMarkerClick(index);
                                }
                            }}
                        >
                            <Popup closeButton={false} className="custom-popup">
                                <div className="p-1 rounded bg-black cursor-pointer" onClick={() => onMarkerClick && onMarkerClick(index)}>
                                    <img 
                                        src={photo.thumbnailUrl} 
                                        className="w-24 h-24 object-cover rounded shadow-md border border-white/10 hover:border-white/40 transition" 
                                        alt="map thumbnail" 
                                    />
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
