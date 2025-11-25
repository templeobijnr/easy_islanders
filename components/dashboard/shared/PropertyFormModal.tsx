import React, { useState, useRef, useEffect } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    X, Building2, Sparkles, Loader2, Zap, Layers, Ruler, FileText,
    List, Image as ImageIcon, UploadCloud, Trash2, Star, MapPin, Search,
    Crosshair, ArrowLeft, TrendingUp, Eye, Calendar, MessageSquare, Settings,
    Activity, DollarSign, Download
} from 'lucide-react';
import { Listing } from '../../../types';
import { auth } from '../../../services/firebaseConfig';
import { importPropertyFromUrl } from '../../../services/geminiService';

interface PropertyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (property: any) => Promise<void>;
    initialData?: Listing;
    isEditMode?: boolean;
    initialView?: 'overview' | 'edit';
}

type FormTab = 'essentials' | 'details' | 'location' | 'amenities' | 'media';

const LISTING_TYPES = [
    { id: 'sale', label: 'For Sale' },
    { id: 'short-term', label: 'Short-Term Rental' },
    { id: 'long-term', label: 'Long-Term Rental' },
    { id: 'project', label: 'Off-Plan Project' }
];

const PROPERTY_TYPES = [
    'Villa', 'Semi-Detached', 'Residence', 'Detached House', 'Timeshare',
    'Unfinished Building', 'Flat', 'Penthouse', 'Bungalow', 'Complete Building'
];

const LOCATIONS = ['Kyrenia', 'Bellapais', 'Catalkoy', 'Esentepe', 'Lapta', 'Alsancak', 'Nicosia', 'Famagusta', 'Iskele', 'Long Beach'];

const FURNISHING_STATUS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const DEED_TYPES = ['Exchange Title', 'Turkish Title', 'TMD Title', 'Leasehold'];

const AMENITY_OPTIONS = [
    'Pool', 'Gym', 'Wi-Fi', 'Hot Tub', 'Air Conditioning', 'Sea View',
    'Heating', 'TV', 'Mountain View', 'Kitchen', 'Spa', 'Microwave',
    'Flat Screen TV', 'Shower', 'Sauna', 'Toilets', 'Linens',
    'Private Garden', 'Garage', 'Solar Panels', 'Fireplace',
    'Gated Community', 'Security 24/7', 'Generator', 'Smart Home',
    'BBQ Area', 'Jacuzzi', 'Elevator', 'White Goods', 'Balcony',
    'Terrace', 'Parking', 'Storage Room', 'Walk-in Closet'
];

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ isOpen, onClose, onSave, initialData, isEditMode, initialView = 'overview' }) => {
    const [viewMode, setViewMode] = useState<'overview' | 'edit'>(!isEditMode ? 'edit' : initialView);
    const [activeFormTab, setActiveFormTab] = useState<FormTab>('essentials');

    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Location State
    const [pinPosition, setPinPosition] = useState({ x: 41, y: 45 });
    const [searchQuery, setSearchQuery] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<any>(initialData || {
        title: '', description: '', price: 0, currency: 'GBP', category: 'Apartment',
        rentalType: 'sale', location: 'Kyrenia', bedrooms: 2, bathrooms: 1,
        squareMeters: 0, plotSize: 0, buildYear: 2024, furnishedStatus: 'Unfurnished',
        amenities: [], imageUrl: '', images: [],
        latitude: 35.3300, longitude: 33.3200,
        formattedAddress: '',
        status: 'draft'
    });
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setViewMode(!isEditMode ? 'edit' : initialView);
            setForm(initialData || {
                title: '', description: '', price: 0, currency: 'GBP', category: 'Apartment',
                rentalType: 'sale', location: 'Kyrenia', bedrooms: 2, bathrooms: 1,
                squareMeters: 0, plotSize: 0, buildYear: 2024, furnishedStatus: 'Unfurnished',
                amenities: [], imageUrl: '', images: [],
                latitude: 35.3300, longitude: 33.3200,
                formattedAddress: '',
                status: 'draft'
            });
        }
    }, [isOpen, initialData, initialView, isEditMode]);

    const canonicalDistricts = ['Kyrenia', 'Girne', 'Catalkoy', 'Çatalköy', 'Bellapais', 'Alsancak', 'Lapta', 'Iskele', 'Famagusta', 'Nicosia', 'Lefkosa'];

    useEffect(() => {
        if (!mapboxToken || searchQuery.trim().length < 3) {
            setLocationSuggestions([]);
            return;
        }
        const controller = new AbortController();
        const fetchSuggestions = async () => {
            try {
                setLocationLoading(true);
                const bbox = '32.0,34.0,35.0,36.8'; // Rough Cyprus/N. Cyprus box
                const proximityLng = form.longitude || 33.32;
                const proximityLat = form.latitude || 35.33;
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&types=address,place,locality,poi&country=cy,tr&bbox=${bbox}&proximity=${proximityLng},${proximityLat}&language=en`;
                const resp = await fetch(url, { signal: controller.signal });
                const data = await resp.json();
                const features = (data.features || []).filter((f: any) => f.place_name);
                // Fallback to canonical list if empty
                if (features.length === 0) {
                    const fallback = canonicalDistricts
                        .filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((d, idx) => ({
                            id: `fallback-${idx}`,
                            text: d,
                            place_name: d,
                            center: [proximityLng, proximityLat],
                            context: []
                        }));
                    setLocationSuggestions(fallback);
                } else {
                    setLocationSuggestions(features);
                }
            } catch (err) {
                if (!(err instanceof DOMException)) {
                    console.error('Geocode error', err);
                }
            } finally {
                setLocationLoading(false);
            }
        };
        fetchSuggestions();
        return () => controller.abort();
    }, [mapboxToken, searchQuery, form.latitude, form.longitude]);

    useEffect(() => {
        const initMap = async () => {
            if (!isOpen || activeFormTab !== 'location' || !mapboxToken || !mapContainerRef.current) return;
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = mapboxToken;

            if (!mapRef.current) {
                mapRef.current = new mapboxgl.default.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [form.longitude || 33.3200, form.latitude || 35.3300],
                    zoom: 11
                });
                mapRef.current.on('click', (e: any) => {
                    setForm((prev: any) => ({ ...prev, latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
                    placeMarker(mapboxgl.default, e.lngLat.lng, e.lngLat.lat);
                    reverseGeocode(e.lngLat.lng, e.lngLat.lat);
                });
            } else {
                mapRef.current.setCenter([form.longitude || 33.3200, form.latitude || 35.3300]);
            }
            placeMarker(mapboxgl.default, form.longitude, form.latitude);
        };

        initMap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeFormTab, form.latitude, form.longitude, mapboxToken]);

    const placeMarker = (mapboxgl: any, lng?: number, lat?: number) => {
        if (!mapRef.current || !lng || !lat) return;
        if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ color: '#0f172a' })
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
        } else {
            markerRef.current.setLngLat([lng, lat]);
        }
    };

    const buildLocationFromFeature = (feature: any) => {
        const [lng, lat] = feature.center || [];
        const ctx = feature.context || [];
        const district = ctx.find((c: any) => c.id?.startsWith('place') || c.id?.startsWith('locality'))?.text || feature.text;
        const region = ctx.find((c: any) => c.id?.startsWith('region'))?.text;
        const country = ctx.find((c: any) => c.id?.startsWith('country'))?.text;
        return {
            latitude: lat,
            longitude: lng,
            location: district || feature.text,
            placeName: feature.place_name,
            formattedAddress: feature.place_name,
            region,
            country
        };
    };

    const reverseGeocode = async (lng?: number, lat?: number) => {
        if (!mapboxToken || lng === undefined || lat === undefined) return;
        try {
            const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,place,locality,region&limit=1`);
            const data = await resp.json();
            const feature = data.features?.[0];
            if (feature) {
                const parsed = buildLocationFromFeature(feature);
                setForm((prev: any) => ({
                    ...prev,
                    ...parsed
                }));
                setSearchQuery(parsed.formattedAddress);
            }
        } catch (err) {
            console.error('Reverse geocode failed', err);
        }
    };

    const handleSuggestionSelect = async (feature: any) => {
        const [lng, lat] = feature.center || [];
        const parsed = buildLocationFromFeature(feature);
        setForm((prev: any) => ({
            ...prev,
            ...parsed
        }));
        setSearchQuery(feature.place_name);
        setLocationSuggestions([]);

        if (mapboxToken && mapRef.current) {
            const mapboxgl = await import('mapbox-gl');
            mapboxgl.default.accessToken = mapboxToken;
            placeMarker(mapboxgl.default, lng, lat);
            mapRef.current.flyTo({ center: [lng, lat], zoom: 13 });
        }
    };

    const useMyLocation = async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }
        setLocationLoading(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            setForm((prev: any) => ({ ...prev, latitude, longitude }));
            await reverseGeocode(longitude, latitude);
            if (mapboxToken && mapRef.current) {
                const mapboxgl = await import('mapbox-gl');
                mapboxgl.default.accessToken = mapboxToken;
                placeMarker(mapboxgl.default, longitude, latitude);
                mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13 });
            }
            setLocationLoading(false);
        }, (err) => {
            console.error(err);
            setLocationError('Unable to fetch location');
            setLocationLoading(false);
        });
    };

    if (!isOpen) return null;

    const handleImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        try {
            const data = await importPropertyFromUrl(importUrl);
            if (data) {
                setForm((prev: any) => ({
                    ...prev,
                    ...data,
                    // Merge existing images with new ones if any
                    images: [...(prev.images || []), ...(data.images || [])],
                    // Ensure we set a cover image if we got one
                    imageUrl: (data.images && data.images.length > 0) ? data.images[0] : (prev.imageUrl || '')
                }));

                // If images were found, switch to media tab to show them
                if (data.images && data.images.length > 0) {
                    setActiveFormTab('media');
                }
            } else {
                alert("Could not automatically extract details. Please verify the URL or enter details manually.");
            }
        } catch (error) {
            console.error("Import error:", error);
            alert("An error occurred during import. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadImage = async (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `property-image-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            // Fallback for CORS restricted images (opens in new tab)
            window.open(url, '_blank');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            const files = Array.from<File>(e.target.files);
            setTimeout(() => {
                const newUrls = files.map(f => URL.createObjectURL(f));
                setForm((prev: any) => ({
                    ...prev,
                    images: [...(prev.images || []), ...newUrls],
                    imageUrl: prev.imageUrl || newUrls[0]
                }));
                setIsUploading(false);
            }, 1000);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(form);
        setIsSaving(false);
    };

    // --- VIEW: PROPERTY DASHBOARD (OVERVIEW) ---
    const renderOverview = () => (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Hero Header */}
            <div className="h-64 relative">
                <img src={form.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                <div className="absolute top-6 right-6 z-10 flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${form.status === 'active' ? 'bg-green-500 text-white border-green-400' : 'bg-slate-500 text-white border-slate-400'}`}>
                        {form.status || 'Draft'}
                    </span>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{form.title}</h2>
                            <div className="flex items-center gap-4 text-sm opacity-90">
                                <span className="flex items-center gap-1"><MapPin size={14} /> {form.location}</span>
                                <span>•</span>
                                <span>{form.category}</span>
                                <span>•</span>
                                <span className="font-mono font-bold text-teal-400">£{form.price.toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewMode('edit')}
                            className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                            <Settings size={16} /> Edit Listing
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 -mt-10 relative z-10 max-w-5xl mx-auto w-full">
                {[
                    { label: 'Total Views', value: form.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Leads', value: 12, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Bookings (May)', value: 4, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Est. Revenue', value: '£4,250', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Columns */}
            <div className="flex-1 overflow-y-auto p-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">

                    {/* Left: Activity Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-slate-400" /> Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { user: 'James Wilson', action: 'requested a viewing', time: '2 hours ago', icon: Calendar },
                                    { user: 'Sarah Jenkins', action: 'sent a message', time: '5 hours ago', icon: MessageSquare },
                                    { user: 'System', action: 'Boost active for 24h', time: '1 day ago', icon: Zap },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-center gap-3 pb-3 border-b border-slate-50 last:border-0">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                            <act.icon size={14} />
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <span className="font-bold text-slate-900">{act.user}</span> {act.action}
                                        </div>
                                        <div className="text-xs text-slate-400">{act.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Performance Graph</h3>
                            <div className="h-40 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                                <TrendingUp size={24} className="mr-2" /> Chart Placeholder
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Actions & Details */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button className="w-full p-3 bg-teal-50 text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-100 text-left flex items-center gap-2">
                                    <Zap size={16} /> Boost Listing
                                </button>
                                <button className="w-full p-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 text-left flex items-center gap-2">
                                    <Calendar size={16} /> Block Dates
                                </button>
                                <button className="w-full p-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 text-left flex items-center gap-2">
                                    <Trash2 size={16} /> Delete Listing
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    // --- VIEW: EDIT FORM (Existing Logic) ---
    const renderEditForm = () => (
        <div className="flex flex-col h-full">
            {/* Edit Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('overview')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Edit Details</h3>
                        <p className="text-xs text-slate-500">Update specifications and media</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-800 shadow-lg">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <span className="flex items-center gap-2">Save Changes</span>}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 bg-white border-b border-slate-100 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'essentials', label: 'Essentials', icon: Layers },
                    { id: 'details', label: 'Property Details', icon: Ruler },
                    { id: 'location', label: 'Location', icon: MapPin },
                    { id: 'amenities', label: 'Amenities', icon: List },
                    { id: 'media', label: 'Photos', icon: ImageIcon }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveFormTab(tab.id as FormTab)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeFormTab === tab.id ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Import Bar (Only if new) */}
            {!isEditMode && (
                <div className="bg-teal-50 p-3 border-b border-teal-100 flex gap-3 items-center px-6">
                    <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase"><Sparkles size={14} /> Quick Import</div>
                    <div className="flex-1 flex gap-2">
                        <input type="text" placeholder="Paste URL..." className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2 text-sm outline-none" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
                        <button onClick={handleImport} disabled={isImporting} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg text-sm flex items-center gap-2 shadow-sm">
                            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Auto-Fill
                        </button>
                    </div>
                    {importError && <div className="text-xs text-red-600 font-semibold ml-4">{importError}</div>}
                </div>
            )}

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

                    {activeFormTab === 'essentials' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Title */}
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                                    <input
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-lg"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g., Luxury 3-Bed Villa with Pool"
                                    />
                                </div>

                                {/* Property Type */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Type</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    >
                                        {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                {/* Listing Type (formerly Status) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Listing Type</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={form.rentalType}
                                        onChange={e => setForm({ ...form, rentalType: e.target.value })}
                                    >
                                        {LISTING_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>

                                {/* Dynamic Price Field */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {form.rentalType === 'short-term' && 'Daily Price'}
                                        {form.rentalType === 'long-term' && 'Monthly Price'}
                                        {form.rentalType === 'sale' && 'Sales Price'}
                                        {form.rentalType === 'project' && 'Project Price'}
                                        {!form.rentalType && 'Price'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={e => setForm({ ...form, price: parseInt(e.target.value) })}
                                            className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Deposit & Cleaning Fee for Short-term */}
                                {form.rentalType === 'short-term' && (
                                    <>
                                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <input
                                                type="checkbox"
                                                id="depositNeeded"
                                                checked={form.depositNeeded || false}
                                                onChange={e => setForm({ ...form, depositNeeded: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <label htmlFor="depositNeeded" className="text-sm font-bold text-blue-900 cursor-pointer">
                                                Deposit Required?
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cleaning Fee</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                                                <input
                                                    type="number"
                                                    value={form.cleaningFee || 0}
                                                    onChange={e => setForm({ ...form, cleaningFee: parseInt(e.target.value) })}
                                                    className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Monthly Deposit for Long-term */}
                                {form.rentalType === 'long-term' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Deposit Needed</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold">£</span>
                                            <input
                                                type="number"
                                                value={form.monthlyDeposit || 0}
                                                onChange={e => setForm({ ...form, monthlyDeposit: parseInt(e.target.value) })}
                                                className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Title Deed & Payment Plan for Sale */}
                                {form.rentalType === 'sale' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title Deed Type</label>
                                            <select
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                                value={form.titleDeedType}
                                                onChange={e => setForm({ ...form, titleDeedType: e.target.value as any })}
                                            >
                                                {DEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                                            <input
                                                type="checkbox"
                                                id="paymentPlanSale"
                                                checked={form.paymentPlanAvailable || false}
                                                onChange={e => setForm({ ...form, paymentPlanAvailable: e.target.checked })}
                                                className="w-5 h-5 text-green-600 rounded"
                                            />
                                            <label htmlFor="paymentPlanSale" className="text-sm font-bold text-green-900 cursor-pointer">
                                                Payment Plan Available?
                                            </label>
                                        </div>
                                    </>
                                )}

                                {/* Payment Plan for Project */}
                                {form.rentalType === 'project' && (
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                        <input
                                            type="checkbox"
                                            id="paymentPlan"
                                            checked={form.paymentPlanAvailable || false}
                                            onChange={e => setForm({ ...form, paymentPlanAvailable: e.target.checked })}
                                            className="w-5 h-5 text-purple-600 rounded"
                                        />
                                        <label htmlFor="paymentPlan" className="text-sm font-bold text-purple-900 cursor-pointer">
                                            Payment Plan Available?
                                        </label>
                                    </div>
                                )}

                                {/* District */}
                                <div className={form.rentalType === 'short-term' || form.rentalType === 'project' ? '' : 'col-span-2'}>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">District</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={form.location}
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                    >
                                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                {/* Furnishing Status */}
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Furnishing Status</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {FURNISHING_STATUS.map(status => (
                                            <div
                                                key={status}
                                                onClick={() => setForm({ ...form, furnishedStatus: status as any })}
                                                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-center transition-all ${
                                                    form.furnishedStatus === status
                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                                        : 'border-slate-200 hover:border-slate-400 bg-white'
                                                }`}
                                            >
                                                <span className="text-sm font-bold">{status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                                    <textarea
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-32 resize-none"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe the property features, location highlights, and unique selling points..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeFormTab === 'details' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Interior & Dimensions</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bedrooms</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                        value={form.bedrooms}
                                        onChange={e => setForm({ ...form, bedrooms: parseInt(e.target.value) })}
                                        placeholder="3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bathrooms</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                        value={form.bathrooms}
                                        onChange={e => setForm({ ...form, bathrooms: parseInt(e.target.value) })}
                                        placeholder="2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Area (m²)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                        value={form.squareMeters}
                                        onChange={e => setForm({ ...form, squareMeters: parseInt(e.target.value) })}
                                        placeholder="120"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plot Size (m²)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                                        value={form.plotSize}
                                        onChange={e => setForm({ ...form, plotSize: parseInt(e.target.value) })}
                                        placeholder="250"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Build Year</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={form.buildYear || new Date().getFullYear()}
                                        onChange={e => setForm({ ...form, buildYear: parseInt(e.target.value) })}
                                    >
                                        <option value={new Date().getFullYear()}>Brand New ({new Date().getFullYear()})</option>
                                        {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i - 1).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeFormTab === 'amenities' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Property Amenities</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {AMENITY_OPTIONS.map(amenity => {
                                    const isSelected = form.amenities?.includes(amenity);
                                    return (
                                        <button
                                            key={amenity}
                                            onClick={() => {
                                                const current = form.amenities || [];
                                                setForm({
                                                    ...form,
                                                    amenities: isSelected
                                                        ? current.filter((a: string) => a !== amenity)
                                                        : [...current, amenity]
                                                });
                                            }}
                                            className={`p-3 rounded-xl text-left text-sm font-medium border transition-all ${
                                                isSelected
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                    isSelected ? 'border-white bg-white' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <div className="w-2 h-2 bg-slate-900 rounded-sm"></div>}
                                                </div>
                                                <span>{amenity}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500">
                                Selected: <span className="font-bold text-slate-900">{form.amenities?.length || 0}</span> amenities
                            </p>
                        </div>
                    )}

                    {activeFormTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                {isUploading ? <div className="flex flex-col items-center"><Loader2 size={40} className="animate-spin text-teal-600" /></div> : <><UploadCloud size={48} className="mx-auto text-slate-300 mb-4" /><p className="font-bold text-slate-700">Upload Photos</p></>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {form.images?.map((img: string, idx: number) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                            <button onClick={() => setForm((prev: any) => ({ ...prev, images: prev.images?.filter((_: any, i: number) => i !== idx) }))} className="p-2 bg-white text-red-500 rounded-full"><Trash2 size={16} /></button>
                                            <button onClick={() => setForm((prev: any) => ({ ...prev, imageUrl: img }))} className={`p-2 rounded-full ${form.imageUrl === img ? 'bg-yellow-400 text-white' : 'bg-white text-slate-400'}`}><Star size={16} /></button>
                                            <button
                                                onClick={(e) => handleDownloadImage(e, img)}
                                                className="p-2 bg-white text-blue-600 rounded-full hover:bg-blue-50"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                        {form.imageUrl === img && <div className="absolute top-2 left-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded text-slate-900">Cover</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeFormTab === 'location' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-3 items-center">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                            placeholder="Search address or area..."
                                        />
                                        {locationSuggestions.length > 0 && (
                                            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {locationSuggestions.map((feat: any) => (
                                                    <button
                                                        key={feat.id}
                                                        onClick={() => handleSuggestionSelect(feat)}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                                                    >
                                                        <div className="font-bold text-slate-900">{feat.text}</div>
                                                        <div className="text-xs text-slate-500">{feat.place_name}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={useMyLocation}
                                        className="px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                                        disabled={locationLoading}
                                    >
                                        <Crosshair size={14} /> {locationLoading ? 'Locating...' : 'Use my location'}
                                    </button>
                                </div>
                                {locationError && <div className="text-xs text-red-600 font-semibold">{locationError}</div>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
                                    {mapboxToken ? (
                                        <div ref={mapContainerRef} className="h-72 w-full" />
                                    ) : (
                                        <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
                                            Add VITE_MAPBOX_TOKEN to enable map view. You can still set coordinates manually.
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
                                            <input type="number" className="w-full p-3 border border-slate-200 rounded-xl" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
                                            <input type="number" className="w-full p-3 border border-slate-200 rounded-xl" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formatted Address</label>
                                        <input type="text" className="w-full p-3 border border-slate-200 rounded-xl" value={form.formattedAddress || form.placeName || form.location || ''} onChange={e => setForm({ ...form, formattedAddress: e.target.value })} placeholder="Address / landmark" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">District / Area</label>
                                        <input type="text" className="w-full p-3 border border-slate-200 rounded-xl" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Kyrenia, Catalkoy" />
                                    </div>
                                    <div className="bg-white border border-slate-200 px-6 py-3 rounded-xl shadow-sm text-sm text-slate-600 font-mono flex items-center justify-between">
                                        <span className="text-xs uppercase text-slate-400 font-bold">Pinned Coords</span>
                                        {form.latitude ? <><span className="font-bold text-slate-900">{form.latitude.toFixed(5)}</span>, <span className="font-bold text-slate-900">{form.longitude?.toFixed(5)}</span></> : "No coordinates set"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl z-10 overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 relative">
                {/* Global Close */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20} /></button>

                {viewMode === 'overview' && isEditMode ? renderOverview() : renderEditForm()}
            </div>
        </div>
    );
};

export default PropertyFormModal;
