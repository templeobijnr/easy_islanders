import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { CheckIn } from '../../../types/connect';
import { Loader2, Users, MapPin, Activity } from 'lucide-react';

const LiveFeedDeck: React.FC = () => {
    const [checkins, setCheckins] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time listener for check-ins
        const q = query(
            collection(db, 'checkins'),
            orderBy('checkedInAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const checkinsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as CheckIn));
            setCheckins(checkinsData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching check-ins:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getTimeAgo = (timestamp: any): string => {
        if (!timestamp) return 'Just now';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getPinTypeIcon = (type: string) => {
        switch (type) {
            case 'place': return <MapPin size={16} className="text-cyan-400" />;
            case 'activity': return <Activity size={16} className="text-purple-400" />;
            case 'event': return <Activity size={16} className="text-pink-400" />;
            default: return <MapPin size={16} className="text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Live Activity Feed
                </h2>
                <p className="text-slate-400 text-sm">
                    Real-time stream of user check-ins across the island.
                </p>
            </div>

            {checkins.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-3xl bg-slate-900/30">
                    <Users className="mx-auto mb-4 text-slate-600" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No Activity Yet</h3>
                    <p className="text-slate-500">Check-ins will appear here in real-time.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-sm font-medium text-slate-400">
                            {checkins.length} active {checkins.length === 1 ? 'check-in' : 'check-ins'}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-emerald-400">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>

                    {checkins.map(checkin => (
                        <div
                            key={checkin.id}
                            className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 hover:border-cyan-500/20 transition-all flex items-center gap-4"
                        >
                            {/* User Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border-2 border-white/10 flex-shrink-0">
                                {checkin.userAvatarUrl ? (
                                    <img
                                        src={checkin.userAvatarUrl}
                                        className="w-full h-full rounded-full object-cover"
                                        alt={checkin.userDisplayName || 'User'}
                                    />
                                ) : (
                                    <Users size={20} className="text-white" />
                                )}
                            </div>

                            {/* Check-in Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm leading-snug">
                                    <span className="font-bold">
                                        {checkin.userDisplayName || 'Anonymous User'}
                                    </span>
                                    {' '}checked into{' '}
                                    <span className="text-cyan-400 font-semibold">
                                        {checkin.pinTitle || checkin.pinType}
                                    </span>
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        {getPinTypeIcon(checkin.pinType)}
                                        <span className="capitalize">{checkin.pinType}</span>
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {getTimeAgo(checkin.checkedInAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveFeedDeck;
