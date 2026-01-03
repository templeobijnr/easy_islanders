/**
 * MapMini - Admin UI component for small interactive maps
 *
 * With graceful fallback when Mapbox token is missing.
 */

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapMiniProps {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}

const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;

const MapMini: React.FC<MapMiniProps> = ({ lat, lng, onChange }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        if (!MAPBOX_TOKEN) {
            console.error(
                "[MapMini] Missing Mapbox token (VITE_MAPBOX_TOKEN). Map disabled.",
            );
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Initialize map
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [lng, lat],
            zoom: 13,
            attributionControl: false
        });

        // Initialize marker
        marker.current = new mapboxgl.Marker({
            draggable: true,
            color: '#06b6d4' // Cyan-500
        })
            .setLngLat([lng, lat])
            .addTo(map.current);

        // Handle drag events
        marker.current.on('dragend', () => {
            const pos = marker.current?.getLngLat();
            if (pos) {
                onChange(pos.lat, pos.lng);
            }
        });

        // Handle map click
        map.current.on('click', (e) => {
            marker.current?.setLngLat(e.lngLat);
            onChange(e.lngLat.lat, e.lngLat.lng);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update marker when props change (if map exists)
    useEffect(() => {
        if (map.current && marker.current) {
            marker.current.setLngLat([lng, lat]);
            map.current.flyTo({ center: [lng, lat], zoom: 13 });
        }
    }, [lat, lng]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="w-full h-full bg-slate-800 text-slate-400 flex flex-col items-center justify-center text-sm font-medium rounded-lg gap-2 py-8">
                <span className="text-2xl">🗺️</span>
                <span>Map unavailable</span>
                <span className="text-xs text-slate-500">(missing VITE_MAPBOX_TOKEN)</span>
            </div>
        );
    }

    return <div ref={mapContainer} className="w-full h-full" />;
};

export default MapMini;
