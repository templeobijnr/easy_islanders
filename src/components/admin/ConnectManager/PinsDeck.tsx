import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { PinType, Region, PinActionConfig } from '../../../types/connect';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPin, Search, Crosshair, Plus, Save } from 'lucide-react';
import ImageUploader from '../Shared/ImageUploader';
import { formatFixed } from '../../../utils/formatters';

// Initialize Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const PinsDeck: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [region, setRegion] = useState<Region>('kyrenia');
    const [pinType, setPinType] = useState<PinType>('place');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [actions, setActions] = useState<PinActionConfig>({
        allowCheckIn: true,
        allowJoin: false,
        allowWave: true,
        allowBooking: false,
        allowTaxi: true
    });
    const [creating, setCreating] = useState(false);

    // Map initialization
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [33.3823, 35.1856],
            zoom: 9
        });

        marker.current = new mapboxgl.Marker({ draggable: true, color: '#06b6d4' })
            .setLngLat([33.3823, 35.1856])
            .addTo(map.current);

        marker.current.on('dragend', () => {
            const lngLat = marker.current?.getLngLat();
            if (lngLat) setCoordinates({ lat: lngLat.lat, lng: lngLat.lng });
        });

        map.current.on('click', (e) => {
            marker.current?.setLngLat(e.lngLat);
            setCoordinates({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            map.current?.flyTo({ center: [longitude, latitude], zoom: 14 });
            marker.current?.setLngLat([longitude, latitude]);
            setCoordinates({ lat: latitude, lng: longitude });
        });
    };

    const handleCreatePin = async () => {
        if (!coordinates || !title) {
            alert('Title and coordinates are required');
            return;
        }

        setCreating(true);
        try {
            const colName = pinType === 'place' ? 'places' :
                pinType === 'activity' ? 'activities' :
                    pinType === 'event' ? 'events' : 'trips';

            const pinData: any = {
                title,
                description,
                category,
                region,
                type: pinType,
                coordinates: new GeoPoint(coordinates.lat, coordinates.lng),
                actions,
                images,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // Add type-specific fields
            if (pinType === 'event' || pinType === 'activity') {
                pinData.startTime = serverTimestamp();
                pinData.endTime = serverTimestamp();
                pinData.approved = true; // Admin-created are auto-approved
            }

            await addDoc(collection(db, colName), pinData);

            alert('✅ Pin created successfully!');
            setTitle('');
            setDescription('');
            setCategory('');
            setImages([]);
        } catch (e) {
            console.error(e);
            alert('❌ Error creating pin');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Map Section */}
            <div className="space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="text-cyan-400" size={20} />
                        Location
                    </h2>
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search Google Places..."
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleUseMyLocation}
                            className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                            title="Use My Location"
                        >
                            <Crosshair size={20} />
                        </button>
                    </div>
                    <div className="h-[500px] rounded-xl overflow-hidden relative bg-slate-950 border border-slate-800">
                        <div ref={mapContainer} className="w-full h-full" />
                        {!mapboxgl.accessToken && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold">
                                Missing Mapbox Token
                            </div>
                        )}
                    </div>
                    {coordinates && (
                        <div className="mt-2 text-xs text-slate-500 font-mono">
                            Lat: {formatFixed(coordinates.lat, 6)}, Lng: {formatFixed(coordinates.lng, 6)}
                        </div>
                    )}
                </div>
            </div>

            {/* Form Section */}
            <div className="space-y-4">
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Plus className="text-cyan-400" />
                        Pin Details
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Title *</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:border-cyan-500 focus:outline-none"
                                placeholder="e.g. Salamis Ruins"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Type *</label>
                                <select
                                    value={pinType}
                                    onChange={e => setPinType(e.target.value as PinType)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:border-cyan-500 focus:outline-none"
                                >
                                    <option value="place">Place</option>
                                    <option value="activity">Activity</option>
                                    <option value="event">Event</option>
                                    <option value="trip">Trip</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Region *</label>
                                <select
                                    value={region}
                                    onChange={e => setRegion(e.target.value as Region)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:border-cyan-500 focus:outline-none"
                                >
                                    <option value="kyrenia">Kyrenia</option>
                                    <option value="famagusta">Famagusta</option>
                                    <option value="nicosia">Nicosia</option>
                                    <option value="karpaz">Karpaz</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                            <input
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:border-cyan-500 focus:outline-none"
                                placeholder="e.g. Historical Site"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl h-24 focus:border-cyan-500 focus:outline-none resize-none"
                                placeholder="Short description..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Enabled Actions</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(actions).map(key => (
                                    <label key={key} className="flex items-center gap-2 text-sm text-slate-300 capitalize cursor-pointer hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={(actions as any)[key]}
                                            onChange={e => setActions(prev => ({ ...prev, [key]: e.target.checked }))}
                                            className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        {key.replace('allow', '')}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Images</label>
                            <ImageUploader
                                images={images}
                                onImagesChange={setImages}
                                storagePath={`pins/${pinType}s`}
                                maxImages={5}
                                disabled={creating}
                            />
                        </div>
                        <button
                            onClick={handleCreatePin}
                            disabled={creating || !title || !coordinates}
                            className="w-full py-3 bg-cyan-500 text-black rounded-xl font-bold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                            {creating ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            Create Pin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PinsDeck;
