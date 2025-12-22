import React, { useState, useEffect } from 'react';
import {
    Filter, RefreshCw, CheckCircle, Clock, AlertCircle,
    User, MapPin, MessageSquare, ChevronRight, Search
} from 'lucide-react';
import { Request, RequestStatus, RequestType } from '../../types/requests';
import { requestsService } from '../../services/domains/requests/requests.service';
import { formatDate } from '../../utils/formatters';

const RequestsConsole: React.FC = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<RequestType | 'all'>('all');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (filterStatus !== 'all') filters.status = filterStatus;
            if (filterType !== 'all') filters.type = filterType;

            const data = await requestsService.getRequests(filters);
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filterStatus, filterType]);

    const handleStatusUpdate = async (id: string, newStatus: RequestStatus) => {
        try {
            await requestsService.updateStatus(id, newStatus);
            // Optimistic update
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error("Failed to update status", error);
            fetchRequests(); // Revert on error
        }
    };

    const getStatusColor = (status: RequestStatus) => {
        switch (status) {
            case 'new': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'in_progress': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'resolved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'cancelled': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl">
                <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_on_provider">Waiting on Provider</option>
                        <option value="resolved">Resolved</option>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="all">All Types</option>
                        <option value="TAXI">Taxi</option>
                        <option value="HOUSING">Housing</option>
                        <option value="SERVICE">Service</option>
                        <option value="ORDER">Order</option>
                    </select>
                </div>

                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Kanban / List View */}
            <div className="grid grid-cols-1 gap-4">
                {requests.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-500">
                        No requests found matching filters.
                    </div>
                )}

                {requests.map(request => (
                    <div key={request.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-cyan-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(request.status)}`}>
                                    {request.status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs font-mono text-slate-500">#{request.id.slice(0, 8)}</span>
                                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded">
                                    {request.type}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={12} />
                                {request.createdAt?.seconds
                                    ? formatDate(request.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Just now'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold text-white mb-1">
                                    {request.service?.title || request.housing?.intent || request.order?.type || 'Request'}
                                </h3>
                                <p className="text-xs text-slate-400 line-clamp-2">
                                    {request.service?.description || request.housing?.notes || request.order?.notes || request.taxi?.notes || 'No description provided.'}
                                </p>

                                {request.origin?.addressText && (
                                    <div className="flex items-center gap-1 text-xs text-cyan-400 mt-2">
                                        <MapPin size={12} />
                                        {request.origin.addressText}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-white/5 md:pl-4 pt-2 md:pt-0">
                                {request.status === 'new' && (
                                    <button
                                        onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                                        className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded border border-cyan-500/20 transition-colors"
                                    >
                                        Accept & Process
                                    </button>
                                )}
                                {request.status === 'in_progress' && (
                                    <button
                                        onClick={() => handleStatusUpdate(request.id, 'resolved')}
                                        className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded border border-emerald-500/20 transition-colors"
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                                <button className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition-colors flex items-center justify-center gap-2">
                                    <MessageSquare size={12} /> Chat User
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RequestsConsole;
