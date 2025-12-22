import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Zap, Users, Clock, MapPin, Edit3, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import CreateActivityModal, { ActivityFormData } from './events/CreateActivityModal';
import { formatDate } from '../../utils/formatters';

// Event Status Types
type EventStatus = 'pending_approval' | 'approved' | 'rejected';

interface BusinessEvent {
    id: string;
    title: string;
    description: string;
    category: string;
    date: Date;
    startTime: string;
    endTime?: string;
    venue: string;
    images: string[];
    price: number;
    currency: string;
    status: EventStatus;
    moderationNote?: string;
    businessId: string;
    createdAt: Date;
}

const EVENTS_COLLECTION = 'events';

const EventsModule = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<BusinessEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<BusinessEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [businessConfig, setBusinessConfig] = useState<any>(null);

    useEffect(() => {
        loadBusinessConfig();
    }, [user?.id]);

    useEffect(() => {
        if (businessConfig?.id) {
            loadEvents();
        }
    }, [businessConfig?.id]);

    const loadBusinessConfig = async () => {
        const config = await StorageService.getBusinessConfig();
        setBusinessConfig(config);
    };

    const loadEvents = async () => {
        if (!businessConfig?.id) return;
        setIsLoading(true);
        try {
            const eventsQuery = query(
                collection(db, EVENTS_COLLECTION),
                where('businessId', '==', businessConfig.id),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(eventsQuery);
            const loadedEvents: BusinessEvent[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    description: data.description || '',
                    category: data.category || '',
                    date: data.date?.toDate?.() || new Date(data.date),
                    startTime: data.startTime || '',
                    endTime: data.endTime || '',
                    venue: data.venue || '',
                    images: data.images || [],
                    price: data.price || 0,
                    currency: data.currency || 'EUR',
                    status: data.status || 'pending_approval',
                    moderationNote: data.moderationNote || '',
                    businessId: data.businessId,
                    createdAt: data.createdAt?.toDate?.() || new Date()
                };
            });
            setEvents(loadedEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (formData: ActivityFormData) => {
        if (!businessConfig?.id) return;

        const eventData = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            date: Timestamp.fromDate(new Date(formData.date)),
            startTime: formData.startTime,
            endTime: formData.endTime || '',
            venue: formData.venue,
            images: formData.images,
            price: formData.price,
            currency: formData.currency,
            status: 'pending_approval' as EventStatus,
            businessId: businessConfig.id,
            businessName: businessConfig.name || '',
            ownerUid: user?.id,
            createdAt: Timestamp.now(),
            region: businessConfig.region || 'north-cyprus',
            location: businessConfig.location || null,
        };

        await addDoc(collection(db, EVENTS_COLLECTION), eventData);
        await loadEvents();
        setIsModalOpen(false);
    };

    const handleDelete = async (eventId: string) => {
        if (!confirm('Delete this event? This action cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
            await loadEvents();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    // Categorize events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const liveEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime() && e.status === 'approved';
    });

    const upcomingEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate > today || e.status !== 'approved';
    });

    const getStatusBadge = (status: EventStatus, moderationNote?: string) => {
        switch (status) {
            case 'pending_approval':
                return (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                        <Clock size={10} /> Pending Review
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                        <CheckCircle2 size={10} /> Live
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-help" title={moderationNote}>
                        <AlertCircle size={10} /> Changes Requested
                    </span>
                );
            default:
                return null;
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            nightlife: '🌙 Nightlife',
            live_music: '🎵 Live Music',
            food_drink: '🍽️ Food & Drink',
            wellness: '🧘 Wellness',
            adventure: '🏄 Adventure',
            cultural: '🎭 Cultural',
            sports: '⚽ Sports',
            workshop: '🎨 Workshop',
        };
        return labels[category] || category;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="text-amber-500 fill-amber-100" /> Push to Connect
                    </h2>
                    <p className="text-slate-500 mt-1">Create events that appear instantly on the island's live feed.</p>
                </div>
                <button
                    onClick={() => { setEditItem(null); setIsModalOpen(true); }}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                    <Plus size={20} />
                    Create Activity
                </button>
            </div>

            {/* LIVE NOW SECTION */}
            {liveEvents.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-1 shadow-lg">
                    <div className="bg-white rounded-[22px] p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live / Happening Today
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {liveEvents.map(event => (
                                <div key={event.id} className="border border-slate-200 rounded-2xl p-4 flex gap-4 hover:border-amber-400 transition-colors group cursor-pointer">
                                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                        {event.images[0] ? (
                                            <img src={event.images[0]} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><Calendar size={24} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-amber-600 uppercase mb-1">Live Now</div>
                                        <h4 className="font-bold text-slate-900 truncate">{event.title}</h4>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {event.startTime}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* UPCOMING / ALL EVENTS */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Calendar size={20} className="text-slate-400" /> Upcoming Activities
                </h3>

                {isLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <Loader2 size={40} className="animate-spin text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">Loading events...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Activities Planned</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            "Happy Hour", "Live Music", or "Special Dinner"? Create it now to attract customers from Connect.
                        </p>
                        <button onClick={() => setIsModalOpen(true)} className="text-slate-900 font-bold underline hover:text-blue-600">Get Started</button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4 text-center">Date & Time</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Price</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {upcomingEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                                    {event.images[0] ? (
                                                        <img src={event.images[0]} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Calendar size={16} /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{event.title}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin size={10} /> {event.venue || 'Main Location'}
                                                        <span className="mx-1">•</span>
                                                        {getCategoryLabel(event.category)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-medium text-slate-900">
                                                {formatDate(event.date, { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(event.status, event.moderationNote)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {event.price === 0 ? (
                                                <span className="text-green-600 font-medium">Free</span>
                                            ) : (
                                                <span className="font-medium">{event.currency} {event.price}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-blue-900">How it works</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        When you create an activity, it's sent to our team for review. Once approved, it will appear on the Connect feed for everyone on the island to discover.
                    </p>
                </div>
            </div>

            <CreateActivityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                businessName={businessConfig?.name || 'Your Business'}
                businessLocation={businessConfig?.location}
            />
        </div>
    );
};

export default EventsModule;
