import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Users, Navigation, Share2, Ticket, Check, Heart, UserPlus } from 'lucide-react';
import { FeedItem } from '../../types/connect';
import { useAuth } from '../../context/AuthContext';
import { checkIn, joinEvent, toggleInterested } from '../../services/connectService';
import { formatDate } from '../../utils/formatters';

interface ActivityDetailModalProps {
    item: FeedItem & { participantCount?: number };
    onClose: () => void;
    onCheckIn: (id: string) => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ item, onClose, onCheckIn }) => {
    const { user } = useAuth();
    const [isJoining, setIsJoining] = useState(false);
    const [hasJoined, setHasJoined] = useState(false); // In real app, check initial state
    const [isInterested, setIsInterested] = useState(false);

    const image = item.images?.[0] || 'https://source.unsplash.com/random/800x600/?island';
    const isLive = (item as any)._status === 'live';
    const isUserActivity = item.type === 'user_activity';

    // Format Date
    const startTime = (item as any).startTime;
    const dateStr = startTime
        ? formatDate(startTime, { weekday: 'long', month: 'long', day: 'numeric' })
        : 'Date TBA';

    const timeStr = startTime
        ? formatDate(startTime, { hour: '2-digit', minute: '2-digit' })
        : '';

    const handleJoin = async () => {
        if (!user) return; // TODO: Show login
        setIsJoining(true);
        try {
            if (isUserActivity) {
                await toggleInterested(item.id, user.uid, hasJoined); // Toggle logic
                setHasJoined(!hasJoined);
            } else {
                await joinEvent(user.uid, item.id, item.type);
                setHasJoined(true);
            }
        } catch (error) {
            console.error("Failed to join:", error);
        } finally {
            setIsJoining(false);
        }
    };

    const handleCheckIn = () => {
        onCheckIn(item.id);
        // Optimistic update handled by parent or local state if needed
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                >
                    <X size={20} />
                </button>

                {/* HERO IMAGE */}
                <div className="relative h-64 sm:h-80 shrink-0">
                    <img src={image} className="w-full h-full object-cover" alt={item.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
                                {item.type.replace('_', ' ')}
                            </span>
                            {isLive && (
                                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                                    <span className="w-2 h-2 bg-white rounded-full" /> LIVE NOW
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">{item.title}</h2>
                        {item.participantCount !== undefined && (
                            <div className="flex items-center gap-2 text-white/90 font-medium text-sm">
                                <Users size={16} className="text-cyan-400" />
                                {item.participantCount} people going
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTENT SCROLL */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-6 space-y-8">

                        {/* Primary Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm text-slate-900 border border-slate-100">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Date & Time</div>
                                    <div className="text-sm font-bold text-slate-900">{dateStr}</div>
                                    <div className="text-sm text-slate-500">{timeStr}</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm text-slate-900 border border-slate-100">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Location</div>
                                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{(item as any).locationName || (item as any).address || 'Location TBA'}</div>
                                    <div className="text-sm text-slate-500 line-clamp-1">{(item as any).region}</div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">About this Activity</h3>
                            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                {item.description || "No description provided for this activity. Contact the host for more details."}
                            </p>
                        </div>

                        {/* Host / Organizer (If Avail) */}
                        {/* Placeholder for now */}
                    </div>
                </div>

                {/* ACTION BAR (Sticky Bottom) */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">

                    {/* Check In (Primary if Live) */}
                    <button
                        onClick={handleCheckIn}
                        className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                        <MapPin size={18} /> Check In Now
                    </button>

                    {/* Join / RSVP */}
                    <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${hasJoined
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-lg'
                            }`}
                    >
                        {hasJoined ? <Check size={18} /> : <UserPlus size={18} />}
                        {hasJoined ? 'You\'re Going' : 'RSVP / Join'}
                    </button>

                    {/* Share */}
                    <button className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors">
                        <Share2 size={20} />
                    </button>

                    {/* Navigate */}
                    <button className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors">
                        <Navigation size={20} />
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;
