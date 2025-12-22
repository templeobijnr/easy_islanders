import React from 'react';
import { MapPin, Navigation, Utensils, Calendar, Users, X, Car, Phone, Globe, MessageCircle } from 'lucide-react';
import { FeedItem } from '../../types/connect';
import { SocialUser } from '../../types/social';

interface MapBottomSheetProps {
    item: FeedItem;
    currentUser: SocialUser | null;
    onClose: () => void;
    onCheckIn?: (id: string) => void;
    onJoin?: (id: string) => void;
    onBook?: (id: string) => void;
    onTaxi?: (id: string) => void;
    onNavigate?: (id: string) => void;
}

const MapBottomSheet: React.FC<MapBottomSheetProps> = ({
    item,
    currentUser,
    onClose,
    onCheckIn,
    onJoin,
    onBook,
    onTaxi,
    onNavigate
}) => {
    const isPlace = item.type === 'place';
    const isActivity = item.type === 'activity';
    const isEvent = item.type === 'event';
    const isStay = item.type === 'stay';

    const image = item.images?.[0] || 'https://source.unsplash.com/random/800x600/?island';

    return (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-30 animate-in slide-in-from-bottom-4 duration-300">
            {/* Image Header */}
            <div className="relative h-32">
                <img src={image} className="w-full h-full object-cover" alt={item.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
                >
                    <X size={16} />
                </button>
                <div className="absolute bottom-3 left-4 text-white">
                    <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-0.5">{item.category || item.type}</div>
                    <h3 className="font-bold text-xl leading-tight">{item.title}</h3>
                </div>
            </div>

            <div className="p-4">
                {/* Meta Info */}
                <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
                    {item.coordinates && (
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{(item as any).address || 'North Cyprus'}</span>
                        </div>
                    )}
                    {(item as any).price && (
                        <div className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {(item as any).currency} {(item as any).price}
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-5 line-clamp-3 leading-relaxed">
                    {item.description}
                </p>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Primary Action */}
                    {(isActivity || isEvent) && (
                        <button
                            onClick={() => onJoin?.(item.id)}
                            className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-200"
                        >
                            {isEvent ? <Calendar size={16} /> : <Users size={16} />}
                            {isEvent ? 'RSVP for Event' : 'Join Activity'}
                        </button>
                    )}

                    {(isStay) && (
                        <button
                            onClick={() => onBook?.(item.id)}
                            className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-200"
                        >
                            <Calendar size={16} /> Book Now
                        </button>
                    )}

                    {/* Check In (Places/Activities) */}
                    {(isPlace || isActivity) && (
                        <button
                            onClick={() => onCheckIn?.(item.id)}
                            className={`py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${!isActivity ? 'col-span-2' : ''}`}
                        >
                            <MapPin size={16} /> Check In
                        </button>
                    )}

                    {/* Taxi */}
                    <button
                        onClick={() => onTaxi?.(item.id)}
                        className="py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Car size={16} /> Taxi
                    </button>

                    {/* Contact (if available) */}
                    {(item as any).phone && (
                        <button
                            onClick={() => window.location.href = `tel:${(item as any).phone}`}
                            className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Phone size={16} /> Call
                        </button>
                    )}

                    {/* Navigate */}
                    <button
                        onClick={() => onNavigate?.(item.id)}
                        className="py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Navigation size={16} /> Navigate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapBottomSheet;
