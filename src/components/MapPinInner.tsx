"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
});

function LocationPicker({ onSelect, current }: { onSelect: (lat: number, lng: number) => void, current: {lat: number, lng: number} | null }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    
    return current ? <Marker position={[current.lat, current.lng]} /> : null;
}

export default function MapPinInner({ 
    lat, lng, onLocationSelect 
}: { 
    lat: number | null, 
    lng: number | null, 
    onLocationSelect: (lat: number, lng: number) => void 
}) {
    const defaultCenter: [number, number] = [20, 0];
    const initialCenter: [number, number] = lat && lng ? [lat, lng] : defaultCenter;

    return (
        <MapContainer 
            center={initialCenter} 
            zoom={lat && lng ? 12 : 2} 
            style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <LocationPicker 
                current={lat && lng ? { lat, lng } : null} 
                onSelect={onLocationSelect} 
            />
        </MapContainer>
    );
}
