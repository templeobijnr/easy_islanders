import React from 'react';
import { MapPin, Users, Navigation, Check } from 'lucide-react';
import { LiveVenue } from '../../types/connect';

interface LiveVenueCardProps {
    venue: LiveVenue;
    onCheckIn: (listingId: string) => void;
    onViewOnMap: (listingId: string, coordinates: { lat: number; lng: number }) => void;
    isCheckedIn?: boolean;
}

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
    restaurants: '🍽️',
    cafes: '☕',
    bars: '🍺',
    nightlife: '🍸',
    spas_wellness: '💆',
    gyms_fitness: '💪',
    beaches: '🏖️',
    shopping: '🛍️',
    default: '📍',
};

const LiveVenueCard: React.FC<LiveVenueCardProps> = ({
    venue,
    onCheckIn,
    onViewOnMap,
    isCheckedIn = false,
}) => {
    const icon = CATEGORY_ICONS[venue.category] || CATEGORY_ICONS.default;

    return (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors">
            {/* Image */}
            <div className="relative h-32">
                {venue.images[0] ? (
                    <img
                        src={venue.images[0]}
                        alt={venue.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                        <span className="text-4xl">{icon}</span>
                    </div>
                )}

                {/* Live badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-white">LIVE</span>
                </div>

                {/* Check-in count */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                    <Users size={12} className="text-cyan-400" />
                    <span className="text-xs font-bold text-white">{venue.checkInCount}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title & Category */}
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="text-white font-bold text-lg leading-tight">{venue.title}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                            <MapPin size={12} />
                            {venue.address || venue.region}
                        </p>
                    </div>
                    <span className="text-xl">{icon}</span>
                </div>

                {/* Avatar stack & names */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-2">
                        {venue.recentAvatars.map((avatar, i) => (
                            <img
                                key={i}
                                src={avatar}
                                alt=""
                                className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
                            />
                        ))}
                        {venue.checkInCount > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">+{venue.checkInCount - 3}</span>
                            </div>
                        )}
                    </div>
                    <span className="text-slate-400 text-xs">
                        {venue.recentNames[0]}
                        {venue.checkInCount > 1 && ` +${venue.checkInCount - 1} more`}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onCheckIn(venue.listingId)}
                        disabled={isCheckedIn}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all ${isCheckedIn
                                ? 'bg-green-500/20 text-green-400 cursor-default'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                            }`}
                    >
                        <Check size={16} />
                        {isCheckedIn ? 'Checked In' : 'Check In'}
                    </button>
                    <button
                        onClick={() => onViewOnMap(venue.listingId, venue.coordinates)}
                        className="flex items-center justify-center gap-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                    >
                        <Navigation size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveVenueCard;
