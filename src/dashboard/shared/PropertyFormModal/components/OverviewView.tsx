/**
 * OverviewView - Property dashboard/overview mode
 */
import React from 'react';
import {
    MapPin,
    Settings,
    Eye,
    MessageSquare,
    Calendar,
    DollarSign,
    Activity,
    Zap,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import type { PropertyFormData } from '../types';

interface OverviewViewProps {
    form: PropertyFormData;
    onEditClick: () => void;
}

const OverviewView: React.FC<OverviewViewProps> = ({ form, onEditClick }) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Hero Header */}
            <div className="h-64 relative">
                <img src={form.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                <div className="absolute top-6 right-6 z-10 flex gap-2">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${form.status === 'active'
                                ? 'bg-green-500 text-white border-green-400'
                                : 'bg-slate-500 text-white border-slate-400'
                            }`}
                    >
                        {form.status || 'Draft'}
                    </span>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{form.title}</h2>
                            <div className="flex items-center gap-4 text-sm opacity-90">
                                <span className="flex items-center gap-1">
                                    <MapPin size={14} /> {form.location}
                                </span>
                                <span>•</span>
                                <span>{form.category}</span>
                                <span>•</span>
                                <span className="font-mono font-bold text-teal-400">
                                    {formatMoney(typeof form.price === 'number' ? form.price : null, '£')}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onEditClick}
                            className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                            <Settings size={16} /> Edit Listing
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 -mt-10 relative z-10 max-w-5xl mx-auto w-full">
                {[
                    { label: 'Total Views', value: form.views || 0, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Leads', value: 12, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Bookings (May)', value: 4, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Est. Revenue', value: '£4,250', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Columns */}
            <div className="flex-1 overflow-y-auto p-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Left: Activity Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-slate-400" /> Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { user: 'James Wilson', action: 'requested a viewing', time: '2 hours ago', icon: Calendar },
                                    { user: 'Sarah Jenkins', action: 'sent a message', time: '5 hours ago', icon: MessageSquare },
                                    { user: 'System', action: 'Boost active for 24h', time: '1 day ago', icon: Zap },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-center gap-3 pb-3 border-b border-slate-50 last:border-0">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                            <act.icon size={14} />
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <span className="font-bold text-slate-900">{act.user}</span> {act.action}
                                        </div>
                                        <div className="text-xs text-slate-400">{act.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Performance Graph</h3>
                            <div className="h-40 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                                <TrendingUp size={24} className="mr-2" /> Chart Placeholder
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Actions */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button className="w-full p-3 bg-teal-50 text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-100 text-left flex items-center gap-2">
                                    <Zap size={16} /> Boost Listing
                                </button>
                                <button className="w-full p-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 text-left flex items-center gap-2">
                                    <Calendar size={16} /> Block Dates
                                </button>
                                <button className="w-full p-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 text-left flex items-center gap-2">
                                    <Trash2 size={16} /> Delete Listing
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewView;
