import React from 'react';
import { MapPin, Users, Clock, Navigation, UserPlus, Check, Share2, Send, Heart, Calendar } from 'lucide-react';
import { UserActivity, ActivityCategory } from '../../types/connect';
import { Timestamp } from 'firebase/firestore';
import { formatDate } from '../../utils/formatters';

interface ActivityCardProps {
    activity: UserActivity;
    onGoing?: (activityId: string) => void;
    onInterested?: (activityId: string) => void;
    onShare?: (activity: UserActivity) => void;
    onInvite?: (activity: UserActivity) => void;
    onViewOnMap?: (activityId: string, coordinates?: { lat: number; lng: number }) => void;
    currentUserId?: string;
}

// Category styling
const CATEGORY_CONFIG: Record<ActivityCategory, { icon: string; color: string }> = {
    social: { icon: '🎉', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    sports: { icon: '⚽', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    food: { icon: '🍽️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    music: { icon: '🎵', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    outdoors: { icon: '🏕️', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    wellness: { icon: '🧘', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
    culture: { icon: '🎭', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    other: { icon: '✨', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const ActivityCard: React.FC<ActivityCardProps> = ({
    activity,
    onGoing,
    onInterested,
    onShare,
    onInvite,
    onViewOnMap,
    currentUserId,
}) => {
    const isHost = currentUserId === activity.hostUserId;
    const isGoing = currentUserId && activity.goingUserIds?.includes(currentUserId);
    const isInterested = currentUserId && activity.interestedUserIds?.includes(currentUserId);
    const categoryConfig = CATEGORY_CONFIG[activity.category || 'social'];

    // Format date/time
    const formatDateTime = (time: Timestamp | Date): string => {
        const date = time instanceof Timestamp ? time.toDate() : new Date(time);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const timeStr = formatDate(date, { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Today at ${timeStr}`;
        if (isTomorrow) return `Tomorrow at ${timeStr}`;
        return `${formatDate(date, { month: 'short', day: 'numeric' })} at ${timeStr}`;
    };

    // Status badge styling
    const statusStyles = {
        live: 'bg-green-500/90 text-white',
        upcoming: 'bg-amber-500/90 text-white',
        past: 'bg-slate-500/90 text-white',
    };

    const statusLabels = {
        live: 'Live Now',
        upcoming: formatDateTime(activity.startDate),
        past: 'Ended',
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: activity.title,
                text: `Join me for ${activity.title}!`,
                url: window.location.href,
            });
        } else if (onShare) {
            onShare(activity);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Cover Image */}
            {activity.coverImage && (
                <div className="h-40 relative">
                    <img
                        src={activity.coverImage}
                        alt={activity.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Status badge */}
                    <div className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusStyles[activity.status]}`}>
                        {activity.status === 'live' && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                        {activity.status === 'upcoming' && <Calendar size={10} />}
                        {statusLabels[activity.status]}
                    </div>
                    {/* Category badge */}
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold border ${categoryConfig.color}`}>
                        {categoryConfig.icon} {activity.category}
                    </div>
                </div>
            )}

            <div className="p-4">
                {/* Header - No image case */}
                {!activity.coverImage && (
                    <div className="flex items-start justify-between mb-3">
                        {/* Status badge */}
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusStyles[activity.status]}`}>
                            {activity.status === 'live' && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                            {activity.status === 'upcoming' && <Calendar size={10} />}
                            {statusLabels[activity.status]}
                        </span>
                        {/* Category badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${categoryConfig.color}`}>
                            {categoryConfig.icon} {activity.category}
                        </span>
                    </div>
                )}

                {/* Host & Title */}
                <div className="flex items-start gap-3 mb-3">
                    <img
                        src={activity.hostAvatar}
                        alt={activity.hostName}
                        className="w-10 h-10 rounded-full border-2 border-purple-500 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 font-bold text-lg leading-tight">{activity.title}</h3>
                        <p className="text-slate-500 text-sm">
                            by {activity.hostName}
                            {isHost && <span className="ml-1 text-purple-500 font-medium">(You)</span>}
                        </p>
                    </div>
                </div>

                {/* Location & Time */}
                <div className="flex flex-wrap gap-3 text-slate-500 text-sm mb-3">
                    <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span className="truncate max-w-[150px]">{activity.listingTitle || activity.freeformLocation || 'Location TBD'}</span>
                    </div>
                    {activity.coverImage && (
                        <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{formatDateTime(activity.startDate)}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                {activity.description && (
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">{activity.description}</p>
                )}

                {/* Attendance counts */}
                <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-green-600">
                        <Check size={14} />
                        <span className="font-medium">{activity.goingCount || 0} going</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-pink-500">
                        <Heart size={14} />
                        <span className="font-medium">{activity.interestedCount || 0} interested</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {/* Going / Interested buttons */}
                    {!isHost && activity.status !== 'past' && (
                        <>
                            <button
                                onClick={() => onGoing?.(activity.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all ${isGoing
                                        ? 'bg-green-500 text-white'
                                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                    }`}
                            >
                                <Check size={16} />
                                {isGoing ? 'Going!' : 'Going'}
                            </button>
                            <button
                                onClick={() => onInterested?.(activity.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all ${isInterested
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-pink-50 text-pink-500 hover:bg-pink-100 border border-pink-200'
                                    }`}
                            >
                                <Heart size={16} />
                                {isInterested ? 'Interested!' : 'Interested'}
                            </button>
                        </>
                    )}

                    {isHost && (
                        <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
                            <span className="text-sm font-medium">Your Event</span>
                        </div>
                    )}

                    {/* Share */}
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                        title="Share"
                    >
                        <Share2 size={16} />
                    </button>

                    {/* Invite */}
                    {onInvite && (
                        <button
                            onClick={() => onInvite(activity)}
                            className="flex items-center justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                            title="Invite friends"
                        >
                            <Send size={16} />
                        </button>
                    )}

                    {/* Map */}
                    {activity.coordinates && onViewOnMap && (
                        <button
                            onClick={() => onViewOnMap(activity.id, activity.coordinates)}
                            className="flex items-center justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                            title="View on map"
                        >
                            <Navigation size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityCard;
