import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar, Search, Check, Loader2, Image, Clock, Users, Globe, Lock, UserCheck } from 'lucide-react';
import { Region, ActivityCategory } from '../../types/connect';
import { UnifiedListingsService } from '../../services/unifiedListingsService';
import { UnifiedListing } from '../../types/UnifiedListing';
import { createUserActivity } from '../../services/connectService';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../../services/firebaseConfig';

interface StartActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userDisplayName: string;
    userAvatarUrl: string;
    onActivityCreated?: (activityId: string) => void;
}

const REGIONS: { value: Region; label: string }[] = [
    { value: 'kyrenia', label: '🏖️ Kyrenia' },
    { value: 'famagusta', label: '🏛️ Famagusta' },
    { value: 'nicosia', label: '🏙️ Nicosia' },
    { value: 'karpaz', label: '🌿 Karpaz' },
    { value: 'lefke', label: '⛰️ Lefke' },
    { value: 'guzelyurt', label: '🍊 Güzelyurt' },
];

const CATEGORIES: { value: ActivityCategory; label: string; icon: string }[] = [
    { value: 'social', label: 'Social', icon: '🎉' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'food', label: 'Food & Drinks', icon: '🍽️' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'outdoors', label: 'Outdoors', icon: '🏕️' },
    { value: 'wellness', label: 'Wellness', icon: '🧘' },
    { value: 'culture', label: 'Culture', icon: '🎭' },
    { value: 'other', label: 'Other', icon: '✨' },
];

const StartActivityModal: React.FC<StartActivityModalProps> = ({
    isOpen,
    onClose,
    userId,
    userDisplayName,
    userAvatarUrl,
    onActivityCreated,
}) => {
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ActivityCategory>('social');
    const [region, setRegion] = useState<Region>('kyrenia');
    const [locationType, setLocationType] = useState<'venue' | 'freeform'>('venue');
    const [selectedVenue, setSelectedVenue] = useState<UnifiedListing | null>(null);
    const [freeformLocation, setFreeformLocation] = useState('');
    const [customCoordinates, setCustomCoordinates] = useState<{ lat: number, lng: number } | undefined>(undefined);

    // Date/Time - flexible
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    // Visibility
    const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

    // Images
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    // Search state
    const [venueSearch, setVenueSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UnifiedListing[]>([]);
    const [customSearchResults, setCustomSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Initialize dates to today
    useEffect(() => {
        const today = new Date();
        setStartDate(today.toISOString().split('T')[0]);
        setStartTime(today.toTimeString().slice(0, 5));
    }, [isOpen]);

    // Search venues when query changes
    useEffect(() => {
        const searchVenues = async () => {
            if (venueSearch.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const allListings = await UnifiedListingsService.getForMap();
                const filtered = allListings.filter(l =>
                    l.title.toLowerCase().includes(venueSearch.toLowerCase()) ||
                    l.category.toLowerCase().includes(venueSearch.toLowerCase())
                );
                setSearchResults(filtered.slice(0, 5));
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        };
        const debounce = setTimeout(searchVenues, 300);
        return () => clearTimeout(debounce);
    }, [venueSearch]);

    // Search custom locations (Nominatim)
    useEffect(() => {
        if (locationType !== 'freeform' || freeformLocation.length < 3) {
            setCustomSearchResults([]);
            return;
        }

        // Don't search if we just selected an item (exact match)
        if (customCoordinates && freeformLocation) return;

        const searchCustom = async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(freeformLocation)}&format=json&addressdetails=1&limit=5&countrycodes=cy`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await response.json();
                setCustomSearchResults(data);
            } catch (err) {
                console.error('Custom search failed:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchCustom, 500);
        return () => clearTimeout(debounce);
    }, [freeformLocation, locationType, customCoordinates]);

    // Reset form on close
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setDescription('');
            setCategory('social');
            setSelectedVenue(null);
            setFreeformLocation('');
            setCustomCoordinates(undefined);
            setVenueSearch('');
            setImages([]);
            setImagePreviews([]);
            setError('');
        }
    }, [isOpen]);

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + images.length > 5) {
            setError('Maximum 5 images allowed');
            return;
        }

        const newImages = [...images, ...files].slice(0, 5);
        setImages(newImages);

        // Create previews
        const newPreviews = newImages.map(file => URL.createObjectURL(file));
        setImagePreviews(newPreviews);
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);
        setImages(newImages);
        setImagePreviews(newPreviews);
    };

    // Upload images to Firebase Storage
    const uploadImages = async (): Promise<string[]> => {
        if (images.length === 0) return [];

        setIsUploadingImages(true);
        const storage = getStorage();
        const urls: string[] = [];

        for (const image of images) {
            const fileName = `activities/${userId}/${Date.now()}_${image.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, image);
            const url = await getDownloadURL(storageRef);
            urls.push(url);
        }

        setIsUploadingImages(false);
        return urls;
    };

    // Handle submit
    const handleSubmit = async () => {
        setError('');

        // Fallback to direct auth check if props are missing/stale
        let currentUserId = userId;
        let displayName = userDisplayName;
        let avatarUrl = userAvatarUrl;

        if (!currentUserId && auth.currentUser) {
            currentUserId = auth.currentUser.uid;
            displayName = displayName || auth.currentUser.displayName || 'Anonymous';
            avatarUrl = avatarUrl || auth.currentUser.photoURL || undefined;
        }

        if (!currentUserId) {
            setError('Please sign in to create an activity');
            return;
        }

        if (!title.trim()) {
            setError('Please enter a title for your activity');
            return;
        }

        if (locationType === 'venue' && !selectedVenue) {
            setError('Please select a venue');
            return;
        }

        if (locationType === 'freeform' && !freeformLocation.trim()) {
            setError('Please enter a location');
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload images first
            const imageUrls = await uploadImages();

            // Build start date
            const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
            const endDateTime = endDate ? new Date(`${endDate}T${endTime || '23:59'}`) : undefined;

            const activityId = await createUserActivity(
                currentUserId, // Use the resolved ID
                displayName,
                avatarUrl,
                {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    category,
                    listingId: selectedVenue?.id,
                    listingTitle: selectedVenue?.title,
                    freeformLocation: locationType === 'freeform' ? freeformLocation.trim() : undefined,
                    lat: selectedVenue?.lat || customCoordinates?.lat,
                    lng: selectedVenue?.lng || customCoordinates?.lng,
                    region: selectedVenue?.region as Region || region,
                    startDate: startDateTime,
                    endDate: endDateTime,
                    isAllDay,
                    images: imageUrls,
                    coverImage: imageUrls[0],
                    visibility,
                }
            );

            onActivityCreated?.(activityId);
            onClose();
        } catch (err: unknown) {
            console.error('Failed to create activity:', err);
            setError(err.message || 'Failed to create activity');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Create Activity / Event</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm flex items-center gap-2">
                            <span className="text-xl">⚠️</span> {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => {
                                setTitle(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="e.g., Pool Day at Escape Beach, Sunset BBQ..."
                            className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none ${error && !title.trim() ? 'border-red-500/50' : 'border-slate-700 focus:border-cyan-500'
                                }`}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Category</label>
                        <div className="grid grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategory(cat.value)}
                                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${category === cat.value
                                        ? 'bg-cyan-500 text-black'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="text-lg">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What's the plan? Any details people should know..."
                            rows={2}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">
                                <Calendar size={14} className="inline mr-1" />
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">
                                <Clock size={14} className="inline mr-1" />
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                disabled={isAllDay}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                disabled={isAllDay}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isAllDay}
                            onChange={e => setIsAllDay(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                        />
                        All day event
                    </label>

                    {/* Location */}
                    <div className="relative z-10">
                        <label className="block text-sm text-slate-400 mb-2">
                            <MapPin size={14} className="inline mr-1" />
                            Location *
                        </label>
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => {
                                    setLocationType('venue');
                                    setCustomSearchResults([]);
                                }}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${locationType === 'venue' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                📍 Select Venue
                            </button>
                            <button
                                onClick={() => {
                                    setLocationType('freeform');
                                }}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${locationType === 'freeform' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                ✏️ Custom
                            </button>
                        </div>

                        {locationType === 'venue' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    value={venueSearch}
                                    onChange={e => setVenueSearch(e.target.value)}
                                    placeholder="Search venues..."
                                    className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 pl-9 text-white placeholder-slate-500 focus:outline-none ${error && !selectedVenue ? 'border-red-500/50' : 'border-slate-700 focus:border-cyan-500'
                                        }`}
                                />
                                {isSearching && <Loader2 className="absolute right-3 top-3 text-slate-400 animate-spin" size={16} />}

                                {selectedVenue && (
                                    <div className="mt-2 p-2 bg-cyan-500/20 border border-cyan-500/50 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Check className="text-cyan-400" size={14} />
                                            <span className="text-white text-sm">{selectedVenue.title}</span>
                                        </div>
                                        <button onClick={() => setSelectedVenue(null)} className="text-slate-400 hover:text-white">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {searchResults.length > 0 && !selectedVenue && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20">
                                        {searchResults.map(venue => (
                                            <button
                                                key={venue.id}
                                                onClick={() => { setSelectedVenue(venue); setVenueSearch(''); setSearchResults([]); if (error) setError(''); }}
                                                className="w-full p-2.5 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-white/5 last:border-0"
                                            >
                                                <MapPin className="text-slate-400" size={14} />
                                                <div>
                                                    <p className="text-white text-sm">{venue.title}</p>
                                                    <p className="text-slate-500 text-xs">{venue.region}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {locationType === 'freeform' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={freeformLocation}
                                    onChange={e => {
                                        setFreeformLocation(e.target.value);
                                        setCustomCoordinates(undefined); // Reset coords on typing
                                        if (error) setError('');
                                    }}
                                    placeholder="Search places or type custom location..."
                                    className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none ${error && !freeformLocation.trim() ? 'border-red-500/50' : 'border-slate-700 focus:border-cyan-500'
                                        }`}
                                />
                                {isSearching && <Loader2 className="absolute right-3 top-2.5 text-slate-400 animate-spin" size={16} />}

                                {/* Custom Suggestions */}
                                {customSearchResults.length > 0 && !customCoordinates && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20 max-h-48 overflow-y-auto">
                                        {customSearchResults.map((place, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setFreeformLocation(place.display_name.split(',')[0]); // Use short name
                                                    setCustomCoordinates({
                                                        lat: parseFloat(place.lat),
                                                        lng: parseFloat(place.lon)
                                                    });
                                                    setCustomSearchResults([]);
                                                    if (error) setError('');
                                                }}
                                                className="w-full p-2.5 text-left hover:bg-slate-700 transition-colors flex items-start gap-2 border-b border-white/5 last:border-0"
                                            >
                                                <MapPin className="text-slate-400 mt-1 flex-shrink-0" size={14} />
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{place.display_name.split(',')[0]}</p>
                                                    <p className="text-slate-500 text-xs truncate">{place.display_name}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-2 flex flex-wrap gap-1">
                                    {REGIONS.map(r => (
                                        <button
                                            key={r.value}
                                            onClick={() => setRegion(r.value)}
                                            className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors ${region === r.value ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <Image size={14} className="inline mr-1" />
                            Photos (up to 5)
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                        <div className="flex gap-2 flex-wrap">
                            {imagePreviews.map((preview, i) => (
                                <div key={i} className="relative w-16 h-16">
                                    <img src={preview} alt="" className="w-full h-full object-cover rounded-lg" />
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {images.length < 5 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 bg-slate-800 border border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                                >
                                    <Image size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Visibility */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Who can see this?</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setVisibility('public')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${visibility === 'public' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                <Globe size={14} /> Public
                            </button>
                            <button
                                onClick={() => setVisibility('friends')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${visibility === 'friends' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                <Users size={14} /> Friends
                            </button>
                            <button
                                onClick={() => setVisibility('private')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${visibility === 'private' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                <Lock size={14} /> Private
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                {isUploadingImages ? 'Uploading images...' : 'Creating...'}
                            </>
                        ) : (
                            <>🚀 Create Activity / Event</>
                        )}
                    </button>
                    {/* Error hint inside footer if needed, but we have main error banner */}
                </div>
            </div>
        </div>
    );
};

export default StartActivityModal;
