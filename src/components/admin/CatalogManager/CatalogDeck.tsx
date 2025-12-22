import React, { useState, useEffect } from 'react';
import { Plus, List, Loader2, Trash2, Edit2, Eye, MapPin, Phone, Globe } from 'lucide-react';
import { StayForm, ActivityForm, EventForm, PlaceForm, ExperienceForm } from './Forms';
import { UnifiedListingsService } from '../../../services/unifiedListingsService';
import { UnifiedListing, ListingType } from '../../../types/UnifiedListing';

// ============================================================================
// CATALOG DECK - UNIFIED VERSION
// ============================================================================

type ViewMode = 'list' | 'create' | 'edit';

const TYPE_TABS: { value: ListingType | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'place', label: 'Places', icon: '📍' },
    { value: 'activity', label: 'Activities', icon: '🎯' },
    { value: 'stay', label: 'Stays', icon: '🏨' },
    { value: 'event', label: 'Events', icon: '🎉' },
    { value: 'experience', label: 'Experiences', icon: '✨' },
];

const CatalogDeck: React.FC = () => {
    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [activeType, setActiveType] = useState<ListingType | 'all'>('all');

    // Data state
    const [listings, setListings] = useState<UnifiedListing[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingListing, setEditingListing] = useState<UnifiedListing | null>(null);

    // Load listings
    const loadListings = async () => {
        setLoading(true);
        try {
            let data: UnifiedListing[];
            if (activeType === 'all') {
                data = await UnifiedListingsService.getAll();
            } else {
                data = await UnifiedListingsService.getByType(activeType);
            }
            setListings(data);
        } catch (err) {
            console.error('Failed to load listings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, [activeType]);

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this listing?')) return;

        try {
            await UnifiedListingsService.delete(id);
            setListings(prev => prev.filter(l => l.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    // Handle edit
    const handleEdit = (listing: UnifiedListing) => {
        setEditingListing(listing);
        setViewMode('edit');
    };

    // Handle form success
    const handleFormSuccess = () => {
        setViewMode('list');
        setEditingListing(null);
        loadListings();
    };

    // Get category label
    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            restaurants: '🍽️ Restaurant',
            cafes: '☕ Cafe',
            bars: '🍺 Bar',
            hotels_stays: '🏨 Hotel',
            spas_wellness: '💆 Spa',
            gyms_fitness: '💪 Gym',
            nightlife: '🍸 Nightlife',
            beaches: '🏖️ Beach',
            parks_nature: '🌿 Nature',
            museums_culture: '🏛️ Museum',
            attractions: '📍 Attraction',
            shopping: '🛍️ Shopping',
            car_rentals: '🚗 Car Rental',
            water_activities: '🚤 Water Activity',
        };
        return labels[category] || category;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-400 text-sm uppercase tracking-wider">SYSTEM › CATALOG</p>
                    <h1 className="text-2xl font-bold text-white mt-1">Catalog Manager</h1>
                </div>

                {viewMode === 'list' ? (
                    <button
                        onClick={() => {
                            if (activeType === 'all') {
                                // Show type selection prompt
                                const typeChoice = prompt(
                                    'Select listing type:\n1. Place (restaurant, bar, cafe, etc.)\n2. Stay (hotel, villa, apartment)\n3. Activity\n4. Event\n5. Experience\n\nEnter number (1-5):'
                                );
                                const typeMap: Record<string, ListingType> = {
                                    '1': 'place',
                                    '2': 'stay',
                                    '3': 'activity',
                                    '4': 'event',
                                    '5': 'experience',
                                };
                                if (typeChoice && typeMap[typeChoice]) {
                                    setActiveType(typeMap[typeChoice]);
                                }
                            }
                            setViewMode('create');
                        }}
                        className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl transition-all"
                    >
                        <Plus size={20} />
                        Add Listing
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setViewMode('list');
                            setEditingListing(null);
                        }}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-xl transition-all"
                    >
                        <List size={20} />
                        Back to List
                    </button>
                )}
            </div>

            {/* Type Tabs (only in list view) */}
            {viewMode === 'list' && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {TYPE_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveType(tab.value)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeType === tab.value
                                ? 'bg-cyan-500 text-black'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            {viewMode === 'list' ? (
                // Listings Grid
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-cyan-500" size={40} />
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <p className="text-lg">No listings found</p>
                            <p className="text-sm mt-2">Click "Add Listing" to create one</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {listings.map(listing => (
                                <div
                                    key={listing.id}
                                    className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors"
                                >
                                    {/* Image */}
                                    <div className="relative h-40">
                                        {listing.images?.[0] ? (
                                            <img
                                                src={listing.images[0]}
                                                alt={listing.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                <MapPin className="text-slate-600" size={40} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-white">
                                            {getCategoryLabel(listing.category)}
                                        </div>
                                        {listing.bookingEnabled && (
                                            <div className="absolute top-2 right-2 bg-cyan-500/80 rounded-lg px-2 py-1 text-xs text-black font-bold">
                                                Bookable
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 space-y-2">
                                        <h3 className="text-white font-bold truncate">{listing.title}</h3>
                                        <p className="text-slate-400 text-sm truncate">{listing.address || listing.region}</p>

                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            {listing.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={12} />
                                                    {listing.phone}
                                                </span>
                                            )}
                                            {listing.website && (
                                                <span className="flex items-center gap-1">
                                                    <Globe size={12} />
                                                    Website
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleEdit(listing)}
                                                className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <Edit2 size={14} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(listing.id)}
                                                className="flex items-center justify-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // Create/Edit Form - render type-specific form based on activeType or editing listing type
                (() => {
                    // Determine which type of form to show
                    const formType = editingListing?.type || (activeType !== 'all' ? activeType : 'place');

                    // Render the appropriate form
                    switch (formType) {
                        case 'stay':
                            return (
                                <StayForm
                                    initialValue={editingListing}
                                    onSave={handleFormSuccess}
                                    onCancel={() => {
                                        setViewMode('list');
                                        setEditingListing(null);
                                    }}
                                />
                            );
                        case 'activity':
                            return (
                                <ActivityForm
                                    initialValue={editingListing}
                                    onSave={handleFormSuccess}
                                    onCancel={() => {
                                        setViewMode('list');
                                        setEditingListing(null);
                                    }}
                                />
                            );
                        case 'event':
                            return (
                                <EventForm
                                    initialValue={editingListing}
                                    onSave={handleFormSuccess}
                                    onCancel={() => {
                                        setViewMode('list');
                                        setEditingListing(null);
                                    }}
                                />
                            );
                        case 'experience':
                            return (
                                <ExperienceForm
                                    initialValue={editingListing}
                                    onSave={handleFormSuccess}
                                    onCancel={() => {
                                        setViewMode('list');
                                        setEditingListing(null);
                                    }}
                                />
                            );
                        case 'place':
                        default:
                            return (
                                <PlaceForm
                                    initialValue={editingListing}
                                    onSave={handleFormSuccess}
                                    onCancel={() => {
                                        setViewMode('list');
                                        setEditingListing(null);
                                    }}
                                />
                            );
                    }
                })()
            )}
        </div>
    );
};

export default CatalogDeck;
