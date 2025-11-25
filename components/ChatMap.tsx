import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

// Ensure tokens are available
const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN;

interface ChatMapProps {
    lat: number;
    lng: number;
    title: string;
    zoom?: number;
}

const ChatMap: React.FC<ChatMapProps> = ({ lat, lng, title, zoom = 13 }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        if (!MAPBOX_TOKEN) {
            console.error("Missing Mapbox Token");
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12', // Standard streets for clarity
                center: [lng, lat],
                zoom: zoom,
                interactive: false, // Static map for chat
                attributionControl: false
            });

            // Add marker
            const el = document.createElement('div');
            el.className = 'marker';
            el.innerHTML = `
                <div class="relative flex items-center justify-center w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
            `;

            new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(map.current);

        } catch (err) {
            console.error("🔴 [ChatMap] Initialization Error:", err);
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [lat, lng, zoom]);

    return (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm my-2 overflow-hidden">
            <div className="h-40 relative">
                <div ref={mapContainer} className="absolute inset-0" />
            </div>
            <div className="p-3 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm text-red-500">
                    <MapPin size={16} />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Open in Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ChatMap;
