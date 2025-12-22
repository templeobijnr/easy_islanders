import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Calendar, Users, ArrowRight,
    Activity, Zap, CheckCircle, Loader2, Power,
    Brain, Package, AlertCircle, Sparkles, PlayCircle, Bot,
    ChevronRight, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../services/integrations/backend/v1.api';

interface OverviewModuleProps {
    onViewChange: (view: string) => void;
}

interface Stats {
    chatsToday: number;
    bookingsToday: number;
    enquiriesToday: number;
}

interface SetupItem {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    action: string;
}

const OverviewModule: React.FC<OverviewModuleProps> = ({ onViewChange }) => {
    const { firebaseUser, claims, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<Stats>({ chatsToday: 0, bookingsToday: 0, enquiriesToday: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [agentStatus, setAgentStatus] = useState<boolean>(true);
    const [lastActivity, setLastActivity] = useState<string | null>(null);
    const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
    const [knowledgeCount, setKnowledgeCount] = useState(0);
    const [productCount, setProductCount] = useState(0);
    const [businessName, setBusinessName] = useState<string>('Business Owner');

    useEffect(() => {
        const load = async () => {
            if (authLoading) return;
            if (!firebaseUser || claims?.role !== 'owner' || !claims.businessId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const toDate = (value: any): Date | null => {
                if (!value) return null;
                if (value instanceof Date) return value;
                if (typeof value?.toDate === 'function') return value.toDate();
                const seconds = value?._seconds ?? value?.seconds;
                if (typeof seconds === 'number') return new Date(seconds * 1000);
                if (typeof value === 'string') {
                    const d = new Date(value);
                    return Number.isNaN(d.getTime()) ? null : d;
                }
                return null;
            };

            try {
                const [businessRes, inboxRes, knowledgeRes, productsRes] = await Promise.all([
                    fetchWithAuth<any>(firebaseUser, '/owner/business'),
                    fetchWithAuth<any>(firebaseUser, '/owner/inbox?limit=50'),
                    fetchWithAuth<any>(firebaseUser, '/owner/knowledge-docs'),
                    fetchWithAuth<any>(firebaseUser, '/owner/products'),
                ]);

                const displayName = businessRes?.business?.displayName || 'Business Owner';
                setBusinessName(displayName);

                const sessions = inboxRes?.sessions || [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const chatsToday = sessions.filter((s: any) => {
                    const d = toDate(s.lastMessageAt);
                    return d ? d.getTime() >= today.getTime() : false;
                }).length;

                const lastSession = sessions[0];
                const lastTime = lastSession ? toDate(lastSession.lastMessageAt) : null;
                if (lastTime) {
                    const mins = Math.floor((Date.now() - lastTime.getTime()) / 60000);
                    if (mins < 1) setLastActivity('Just now');
                    else if (mins < 60) setLastActivity(`${mins} minutes ago`);
                    else setLastActivity(`${Math.floor(mins / 60)} hours ago`);
                } else {
                    setLastActivity(null);
                }

                const docs = knowledgeRes?.docs || [];
                const products = productsRes?.products || [];
                setKnowledgeCount(docs.length);
                setProductCount(products.length);

                setStats({
                    chatsToday,
                    bookingsToday: 0,
                    enquiriesToday: 0
                });

                const items: SetupItem[] = [
                    {
                        id: 'profile',
                        label: 'Add your business name',
                        description: 'So customers know who they\'re talking to',
                        completed: !!displayName && displayName !== 'Business Owner',
                        action: 'profile'
                    },
                    {
                        id: 'agent',
                        label: 'Turn on your salesman',
                        description: 'So it can start answering customers',
                        completed: agentStatus,
                        action: 'settings'
                    },
                    {
                        id: 'knowledge',
                        label: 'Tell your salesman about your business',
                        description: 'Upload your menu, prices, or opening hours',
                        completed: docs.length > 0,
                        action: 'teach'
                    },
                    {
                        id: 'products',
                        label: 'Add your prices',
                        description: 'So your salesman can tell customers how much things cost',
                        completed: products.length > 0,
                        action: 'teach'
                    }
                ];
                setSetupItems(items);
            } catch (error) {
                console.error('[OverviewModule] Failed to load overview data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [authLoading, firebaseUser, claims?.role, claims?.businessId, agentStatus]);

    const completedSteps = setupItems.filter(i => i.completed).length;
    const totalSteps = setupItems.length;
    const isSetupComplete = completedSteps === totalSteps;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-24 bg-slate-50/50 min-h-screen">

            {/* HEADER - LOGIP STYLE */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bot size={14} /> Salesman Control Panel
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                        Welcome, {businessName} 👋
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        This is your dashboard to control your AI salesman that helps you sell on the platform.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN - MAIN CONTENT (2/3) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* THIS IS YOUR SALESMAN CARD */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex items-start gap-6">
                        <div className="w-16 h-16 bg-teal-100 rounded-3xl flex items-center justify-center flex-shrink-0">
                            <Bot className="text-teal-600" size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">This is Your 24/7 Salesman</h3>
                            <p className="text-slate-600 text-lg leading-relaxed mb-4 max-w-2xl">
                                A salesman for your business that works for you <strong>24 hours a day, 7 days a week</strong>.
                                He tells customers what you sell, answers questions, takes bookings,
                                collects numbers, and takes orders.
                            </p>
                            <div className="flex items-center gap-2 text-sm font-bold text-teal-600 bg-teal-50 px-3 py-2 rounded-xl w-fit">
                                <Sparkles size={14} /> Your sales man that never sleeps!
                            </div>
                        </div>
                    </div>

                    {/* STATS ROW - WIDE horizontal cards */}
                    <div className="grid grid-cols-1 gap-4">
                        <div
                            onClick={() => onViewChange('inbox')}
                            className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
                        >
                            <div className="flex-shrink-0 p-5 bg-blue-50 text-blue-600 rounded-2xl">
                                <MessageSquare size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                    <div className="text-4xl font-bold text-slate-900">{isLoading ? '-' : stats.chatsToday}</div>
                                    <h3 className="text-xl font-bold text-slate-800">Conversations</h3>
                                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Today</span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0">
                                    People who messaged asking about your business. See what they asked and how your salesman replied.
                                </p>
                            </div>
                            <div className="hidden md:flex bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <ChevronRight size={24} />
                            </div>
                        </div>

                        <div
                            onClick={() => onViewChange('calendar')}
                            className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
                        >
                            <div className="flex-shrink-0 p-5 bg-purple-50 text-purple-600 rounded-2xl">
                                <Calendar size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                    <h3 className="text-xl font-bold text-slate-800">Manage Reservation Times</h3>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0">
                                    Set your available times to allow your salesman take reservations for your business.
                                </p>
                                <div
                                    className="text-xs font-bold text-purple-600 mt-2 hover:text-purple-700 flex items-center justify-center md:justify-start gap-1 z-10 relative w-fit"
                                >
                                    Manage Availability <ArrowRight size={12} />
                                </div>
                            </div>
                            <div className="hidden md:flex bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                <ChevronRight size={24} />
                            </div>
                        </div>

                        <div
                            onClick={() => onViewChange('inbox')}
                            className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
                        >
                            <div className="flex-shrink-0 p-5 bg-amber-50 text-amber-600 rounded-2xl">
                                <Users size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                    <div className="text-4xl font-bold text-slate-900">{isLoading ? '-' : stats.enquiriesToday}</div>
                                    <h3 className="text-xl font-bold text-slate-800">Contact Requests</h3>
                                    <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Today</span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0">
                                    People who left their phone number or email because they want you to call them back.
                                </p>
                            </div>
                            <div className="hidden md:flex bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                <ChevronRight size={24} />
                            </div>
                        </div>
                    </div>

                    {/* STATUS MAIN CARD */}
                    <div className={`p-8 rounded-[32px] shadow-lg text-white relative overflow-hidden transition-all ${agentStatus ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-red-600'
                        }`}>
                        {/* Abstract Shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="p-5 rounded-3xl bg-white/20 backdrop-blur-md shadow-inner border border-white/10">
                                    <Power size={40} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`flex h-4 w-4 rounded-full ${agentStatus ? 'bg-white animate-pulse' : 'bg-white/50'}`}></span>
                                        <h2 className="text-3xl font-bold">
                                            {agentStatus ? 'Your salesman is ON and working' : 'Your salesman is OFF'}
                                        </h2>
                                    </div>
                                    <p className="text-white/90 text-lg max-w-lg">
                                        {agentStatus
                                            ? (lastActivity
                                                ? `It answered a customer ${lastActivity}`
                                                : 'Ready to answer customer messages right now')
                                            : 'Turn it on so it can start helping your customers!'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 min-w-[180px]">
                                <button
                                    onClick={() => onViewChange('settings')}
                                    className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
                                >
                                    {agentStatus ? 'Settings' : 'Turn On Now'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KNOWLEDGE AREA */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative">
                        {/* Moved Manage Knowledge Button to Top Right */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <Brain size={28} />
                                </div>
                                <div className="max-w-xl">
                                    <h3 className="text-xl font-bold text-slate-900">You can see what your salesman knows about your business</h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Your salesman can only answer questions about information you give it. You can click on manage knowledge to give information about your business.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ACTION AREA WITH BUTTON ABOVE CARDS */}
                        <div className="mb-6 flex justify-end">
                            <button
                                onClick={() => onViewChange('teach')}
                                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
                            >
                                <Sparkles size={16} /> Manage Knowledge
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div onClick={() => onViewChange('teach')} className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">Documents</span>
                                    <div className="p-2 bg-white rounded-full text-indigo-600 shadow-sm group-hover:scale-110 transition-transform"><TrendingUp size={16} /></div>
                                </div>
                                <div className="text-4xl font-bold text-slate-900 mb-2">{knowledgeCount}</div>
                                <div className="font-semibold text-slate-700 leading-tight mb-2">Upload information about your business like menus, prices and anything you would like your salesman to know.</div>
                                <p className="text-xs text-slate-400">Manage uploaded menus, documents, prices</p>
                            </div>

                            <div onClick={() => onViewChange('teach')} className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-widest">Catalog</span>
                                    <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm group-hover:scale-110 transition-transform"><Package size={16} /></div>
                                </div>
                                <div className="text-4xl font-bold text-slate-900 mb-2">{productCount}</div>
                                <div className="font-semibold text-slate-700 leading-tight mb-2">Give your agent prices of your products and services to help you make sales</div>
                                <p className="text-xs text-slate-400">Manage products and services you offer to your customers</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <p className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Sparkles size={18} className="text-amber-500" /> Examples of what you can teach it:
                            </p>
                            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                                <span className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">🏖️ <strong>Are you a beach?</strong> → Sunbed prices, VIP costs</span>
                                <span className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">🥗 <strong>Are you a Restaurant?</strong> → Menu, opening hours</span>
                                <span className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">🍸 <strong>Are you a Bar?</strong> → Drink prices</span>
                                <span className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">💆‍♀️ <strong>Are you a Spa?</strong> → Massage prices</span>
                                <span className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">🏋️ <strong>Are you a Gym?</strong> → Monthly prices</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - SIDEBAR (1/3) */}
                <div className="space-y-8">

                    {/* CHECKLIST */}
                    {!isSetupComplete && (
                        <div className="bg-slate-900 p-6 rounded-[24px] shadow-lg text-white">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <CheckCircle size={20} className="text-emerald-400" /> Get Started
                                </h3>
                                <span className="text-xs bg-white/10 px-2 py-1 rounded-lg text-slate-300 font-mono">
                                    {completedSteps}/{totalSteps}
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mb-6 pb-6 border-b border-white/10">
                                Complete these steps so your salesman can start working for you.
                            </p>
                            <div className="space-y-4">
                                {setupItems.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => !item.completed && onViewChange(item.action)}
                                        className={`flex items-start gap-4 p-3 -mx-3 rounded-xl transition-colors ${!item.completed && 'hover:bg-white/5 cursor-pointer'
                                            }`}
                                    >
                                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border ${item.completed
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-transparent border-slate-600'
                                            }`}>
                                            {item.completed && <CheckCircle size={12} />}
                                        </div>
                                        <div>
                                            <div className={`font-semibold text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                {item.label}
                                            </div>
                                            {!item.completed && (
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <div
                        onClick={() => onViewChange('settings')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[24px] shadow-lg shadow-blue-200 text-white cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <PlayCircle size={32} className="mb-4 text-white/80" />
                        <h3 className="text-xl font-bold mb-1">Try Talking to Your Salesman</h3>
                        <p className="text-white/80 text-sm">
                            Test it yourself! Ask it a question and see how it responds.
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default OverviewModule;
