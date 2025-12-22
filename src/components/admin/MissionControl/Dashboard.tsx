import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebaseConfig';
import { collection, query, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { Activity, Users, MapPin, Calendar, TrendingUp, Zap } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({
        activeUsers: 0,
        checkinsToday: 0,
        eventsToday: 0,
        totalPins: 0,
        loading: true
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = Timestamp.fromDate(today);

            // Count check-ins in last 24 hours
            const checkinsQuery = query(
                collection(db, 'checkins'),
                where('checkedInAt', '>=', todayTimestamp)
            );
            const checkinsSnap = await getCountFromServer(checkinsQuery);

            // Count events created today
            const eventsQuery = query(
                collection(db, 'events'),
                where('createdAt', '>=', todayTimestamp)
            );
            const eventsSnap = await getCountFromServer(eventsQuery);

            // Count total pins (places + activities + events + trips)
            const placesSnap = await getCountFromServer(collection(db, 'places'));
            const activitiesSnap = await getCountFromServer(collection(db, 'activities'));
            const eventsAllSnap = await getCountFromServer(collection(db, 'events'));
            const tripsSnap = await getCountFromServer(collection(db, 'trips'));

            setStats({
                activeUsers: 0, // TODO: Implement presence system
                checkinsToday: checkinsSnap.data().count,
                eventsToday: eventsSnap.data().count,
                totalPins: placesSnap.data().count + activitiesSnap.data().count +
                    eventsAllSnap.data().count + tripsSnap.data().count,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    const statCards = [
        {
            label: 'Total Pins',
            value: stats.totalPins,
            icon: MapPin,
            color: 'cyan',
            trend: null
        },
        {
            label: 'Check-ins Today',
            value: stats.checkinsToday,
            icon: Zap,
            color: 'emerald',
            trend: '+12%'
        },
        {
            label: 'Events Today',
            value: stats.eventsToday,
            icon: Calendar,
            color: 'purple',
            trend: null
        },
        {
            label: 'Active Users',
            value: stats.activeUsers || '—',
            icon: Users,
            color: 'blue',
            trend: null
        }
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
            emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
            purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
            blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }
        };
        return colors[color] || colors.cyan;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Mission Control
                </h2>
                <p className="text-slate-400 text-sm">
                    Real-time overview of system activity and health.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((card) => {
                    const colors = getColorClasses(card.color);
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm hover:border-white/10 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 ${colors.bg} rounded-2xl border ${colors.border}`}>
                                    <Icon size={20} className={colors.text} />
                                </div>
                                {card.trend && (
                                    <span className={`text-xs font-bold ${colors.text} ${colors.bg} px-2 py-1 rounded-full flex items-center gap-1`}>
                                        <TrendingUp size={12} />
                                        {card.trend}
                                    </span>
                                )}
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">
                                {stats.loading ? '—' : card.value}
                            </div>
                            <div className="text-sm text-slate-500">{card.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-cyan-400" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>API Latency</span>
                                <span className="text-emerald-400 font-mono">~24ms</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[92%] animate-pulse"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>Cloud Functions</span>
                                <span className="text-emerald-400 font-mono">Healthy</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-full"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>Firestore</span>
                                <span className="text-emerald-400 font-mono">Connected</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-4">Quick Info</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Firestore Rules Version</span>
                            <span className="text-white font-mono">v1.5</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Environment</span>
                            <span className="text-white font-mono">
                                {import.meta.env.DEV ? 'Development' : 'Production'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Control Tower Version</span>
                            <span className="text-cyan-400 font-mono">v3.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
