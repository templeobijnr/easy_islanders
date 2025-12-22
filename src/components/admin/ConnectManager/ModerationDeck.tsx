import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebaseConfig';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Loader2, CheckCircle, XCircle, Calendar, MapPin as MapPinIcon, MessageSquare, Building2 } from 'lucide-react';
import { formatDate as formatDateSafe } from '../../../utils/formatters';

interface PendingEvent {
    id: string;
    title: string;
    description?: string;
    category?: string;
    region?: string;
    venue?: string;
    businessName?: string;
    businessId?: string;
    startTime?: any;
    images?: string[];
    price?: number;
    currency?: string;
    status: 'pending_approval' | 'approved' | 'rejected';
}

const ModerationDeck: React.FC = () => {
    const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    useEffect(() => {
        // Real-time listener for pending events using new status field
        const q = query(collection(db, 'events'), where('status', '==', 'pending_approval'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PendingEvent));
            setPendingEvents(events);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching pending events:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (eventId: string) => {
        try {
            await updateDoc(doc(db, 'events', eventId), {
                status: 'approved',
                approvedAt: new Date()
            });
            // UI will update automatically via onSnapshot
        } catch (error) {
            console.error('Error approving event:', error);
            alert('Failed to approve event');
        }
    };

    const handleReject = async (eventId: string) => {
        try {
            await updateDoc(doc(db, 'events', eventId), {
                status: 'rejected',
                moderationNote: rejectNote || 'Your event did not meet our guidelines.',
                rejectedAt: new Date()
            });
            setRejectingId(null);
            setRejectNote('');
        } catch (error) {
            console.error('Error rejecting event:', error);
            alert('Failed to reject event');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Date TBD';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return formatDateSafe(date, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Event Moderation Queue
                </h2>
                <p className="text-slate-400 text-sm">
                    Review and approve business-submitted events before they appear on the Connect Feed.
                </p>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-3xl bg-slate-900/30">
                    <CheckCircle className="mx-auto mb-4 text-emerald-500" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
                    <p className="text-slate-500">No pending events to review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-sm font-medium text-slate-400">
                            {pendingEvents.length} pending {pendingEvents.length === 1 ? 'event' : 'events'}
                        </span>
                    </div>

                    {pendingEvents.map(event => (
                        <div
                            key={event.id}
                            className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 hover:border-cyan-500/20 transition-all"
                        >
                            <div className="flex gap-4">
                                {/* Event Image */}
                                {event.images && event.images[0] && (
                                    <div className="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                                        <img src={event.images[0]} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-xl text-white mb-2">
                                                {event.title}
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">
                                                {event.description || 'No description provided'}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {event.businessName && (
                                                    <span className="bg-slate-800 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Building2 size={12} />
                                                        {event.businessName}
                                                    </span>
                                                )}
                                                {event.category && (
                                                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                                                        {event.category}
                                                    </span>
                                                )}
                                                {event.venue && (
                                                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <MapPinIcon size={12} />
                                                        {event.venue}
                                                    </span>
                                                )}
                                                {event.startTime && (
                                                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {formatDate(event.startTime)}
                                                    </span>
                                                )}
                                                {event.price !== undefined && (
                                                    <span className="bg-slate-800 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
                                                        {event.price === 0 ? 'Free' : `${event.currency || 'EUR'} ${event.price}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {rejectingId !== event.id ? (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => setRejectingId(event.id)}
                                                    className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20 hover:border-red-500/40"
                                                    title="Reject Event"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(event.id)}
                                                    className="p-3 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors border border-emerald-500/20 hover:border-emerald-500/40"
                                                    title="Approve Event"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Rejection Note Input */}
                                    {rejectingId === event.id && (
                                        <div className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                            <div className="flex items-start gap-2 mb-3">
                                                <MessageSquare size={16} className="text-red-400 mt-1" />
                                                <span className="text-sm text-red-400 font-medium">Rejection Note (visible to business)</span>
                                            </div>
                                            <textarea
                                                value={rejectNote}
                                                onChange={(e) => setRejectNote(e.target.value)}
                                                placeholder="Explain why this event was rejected..."
                                                rows={2}
                                                className="w-full bg-slate-900 border border-red-500/30 rounded-lg p-3 text-white text-sm outline-none focus:border-red-500"
                                            />
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => { setRejectingId(null); setRejectNote(''); }}
                                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleReject(event.id)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                                                >
                                                    Reject Event
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModerationDeck;
