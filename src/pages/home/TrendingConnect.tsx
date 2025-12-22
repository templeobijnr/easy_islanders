
import React, { useEffect, useState } from 'react';
import { Users, Calendar, ArrowRight, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { UnifiedListingsService } from '../../services/unifiedListingsService';
import { UnifiedListing } from '../../types/UnifiedListing';
import { useNavigate } from 'react-router-dom';

const TrendingConnect: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [events, setEvents] = useState<UnifiedListing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Fetch events
                const allEvents = await UnifiedListingsService.getByType('event');
                // Tak top 3
                setEvents(allEvents.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    return (
        <section className="py-20 bg-slate-50 overflow-hidden relative">
            <div className="container mx-auto px-6">

                {/* Header / Connect Explainer */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
                    <div className="max-w-2xl">
                        <span className="text-teal-600 font-bold tracking-wider uppercase text-sm mb-2 block">
                            Daily Pulse
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                            What's Happening in Your City
                        </h2>
                        <p className="text-lg text-slate-500">
                            Don't miss out on island life. See trending places, live music, and events happening today in North Cyprus.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/connect')}
                        className="group flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full font-semibold text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all"
                    >
                        See All Events
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Trending Events Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        // Skeletons
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse"></div>
                        ))
                    ) : events.length > 0 ? (
                        events.map(event => (
                            <div
                                key={event.id}
                                onClick={() => navigate(`/discover?id=${event.id}`)}
                                className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
                            >
                                <img
                                    src={event.images?.[0] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'}
                                    alt={event.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

                                <div className="absolute bottom-0 left-0 p-6 w-full">
                                    <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
                                        <Calendar size={14} />
                                        <span>Event</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight">
                                        {event.title}
                                    </h3>
                                    {event.region && (
                                        <div className="flex items-center gap-1 text-slate-300 text-sm">
                                            <MapPin size={14} />
                                            {event.region}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        // Fallback if no events
                        <div className="col-span-3 text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                            No upcoming events found. Check back soon!
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default TrendingConnect;
