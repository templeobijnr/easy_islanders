
import React, { useState, useEffect } from 'react';
import { Inbox, Bell, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { StorageService } from '../../../services/storageService';
import { ConsumerRequest } from '../../../types';
import ModuleHeader from '../shared/ModuleHeader';

const RequestsModule: React.FC = () => {
  const [requests, setRequests] = useState<ConsumerRequest[]>([]);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
     const load = async () => {
        const data = await StorageService.getConsumerRequests();
        setRequests(data);
     };
     load();
  }, []);

  const handleAccept = (id: string) => {
     // Mock Logic: Move to "Accepted" status locally
     setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'forwarded' } : r));
  };

  const handleReject = (id: string) => {
     // Mock Logic: Remove from view
     setRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
     <div className="space-y-6 animate-in fade-in">
        <ModuleHeader 
           title="Consumer Requests" 
           description="View and respond to specific requests from users looking for items or services not listed in the marketplace."
           action={
              <button 
                onClick={() => setSubscribed(!subscribed)}
                className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all ${subscribed ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
              >
                 <Bell size={18} className={subscribed ? 'fill-teal-700' : ''} />
                 {subscribed ? 'Alerts On' : 'Subscribe to Alerts'}
              </button>
           }
        />

        <div className="grid grid-cols-1 gap-4">
           {requests.length > 0 ? requests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                 <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide group-hover:bg-slate-900 group-hover:text-white transition-colors">
                       {req.domain}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                       <Clock size={12} /> {new Date(req.timestamp).toLocaleDateString()}
                    </span>
                 </div>
                 
                 <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 flex-shrink-0">?</div>
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 leading-tight">"{req.content}"</h3>
                       {req.budget ? (
                          <div className="text-sm font-medium text-teal-600 mt-1">Budget: £{req.budget}</div>
                       ) : (
                          <div className="text-sm text-slate-400 italic mt-1">No budget specified</div>
                       )}
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="text-xs text-slate-400 font-medium">
                       REQUEST ID: {req.id}
                    </div>
                    
                    <div className="flex gap-3">
                       {req.status === 'pending' ? (
                          <>
                             <button onClick={() => handleReject(req.id)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold text-sm flex items-center gap-2 transition-colors">
                                <XCircle size={16} /> Ignore
                             </button>
                             <button onClick={() => handleAccept(req.id)} className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm flex items-center gap-2 shadow-md transition-transform hover:scale-105">
                                <MessageSquare size={16} /> Make Offer
                             </button>
                          </>
                       ) : (
                          <span className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg">
                             <CheckCircle size={16} /> You responded
                          </span>
                       )}
                    </div>
                 </div>
              </div>
           )) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                 <Inbox size={48} className="mx-auto mb-4 text-slate-300"/>
                 <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
                 <p className="text-slate-500">Users haven't posted any new requests in your category yet.</p>
              </div>
           )}
        </div>
     </div>
  );
};

export default RequestsModule;
