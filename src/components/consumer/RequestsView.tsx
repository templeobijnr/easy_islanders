
import React, { useState, useEffect } from 'react';
import { Send, Plus, MessageSquare, CheckCircle, Clock, ShoppingBag, Inbox } from 'lucide-react';
import { ConsumerRequest, MarketplaceDomain } from '../../types';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { useLanguage } from '../../context/LanguageContext';
import MessagesView from './MessagesView';
import { formatDate } from '../../utils/formatters';

const RequestsView: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'requests' | 'messages'>('requests');
  const [requests, setRequests] = useState<ConsumerRequest[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const [newContent, setNewContent] = useState('');
  const [newDomain, setNewDomain] = useState<MarketplaceDomain>('Marketplace');
  const [newBudget, setNewBudget] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await StorageService.getConsumerRequests();
      setRequests(data);
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (!newContent.trim()) return;

    const req: ConsumerRequest = {
      id: `REQ-${Date.now()}`,
      userId: 'me',
      content: newContent,
      domain: newDomain,
      status: 'pending',
      timestamp: new Date().toISOString(),
      budget: newBudget ? parseFloat(newBudget) : undefined,
      responses: 0
    };

    await StorageService.saveConsumerRequest(req);
    const updated = await StorageService.getConsumerRequests();
    setRequests(updated);
    setIsCreating(false);
    setNewContent('');
    setNewBudget('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Side navigation */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-2">
            <h1 className="text-xl font-bold text-slate-900 mb-3">My Hub</h1>
            <button
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <ShoppingBag size={18} />
              Requests
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'messages'
                  ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <Inbox size={18} />
              Messages
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {activeTab === 'requests' && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      My Requests
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Ask for products or services you can&apos;t find. We
                      forward them to local businesses.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all"
                  >
                    <Plus size={20} /> New Request
                  </button>
                </div>

                {isCreating && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mb-8 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">
                      What are you looking for?
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          Category
                        </label>
                        <select
                          value={newDomain}
                          onChange={e =>
                            setNewDomain(e.target.value as MarketplaceDomain)
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        >
                          {[
                            'Marketplace',
                            'Real Estate',
                            'Cars',
                            'Services',
                            'Restaurants',
                            'Events',
                          ].map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          Request Details
                        </label>
                        <textarea
                          value={newContent}
                          onChange={e => setNewContent(e.target.value)}
                          placeholder="e.g. I'm looking for a vintage record player in working condition..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          Max Budget (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-400">
                            £
                          </span>
                          <input
                            type="number"
                            value={newBudget}
                            onChange={e => setNewBudget(e.target.value)}
                            className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setIsCreating(false)}
                          className="text-slate-500 font-bold hover:text-slate-800 px-4"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={!newContent.trim()}
                          className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          Submit Request <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {requests.length > 0 ? (
                    requests.map(req => (
                      <div
                        key={req.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between"
                      >
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                                {req.domain}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(req.timestamp, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2">
                              &quot;{req.content}&quot;
                            </h4>
                            {req.budget && (
                              <div className="text-sm text-slate-500">
                                Budget:{' '}
                                <span className="font-bold text-slate-900">
                                  £{req.budget}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                          <div className="flex flex-col items-center min-w-[80px]">
                            <div className="font-bold text-xl text-slate-900">
                              {req.responses || 0}
                            </div>
                            <div className="text-xs text-slate-500">
                              Offers
                            </div>
                          </div>
                          <div className="flex flex-col items-center min-w-[100px]">
                            {req.status === 'pending' && (
                              <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-xs font-bold">
                                <Clock size={14} /> Pending
                              </div>
                            )}
                            {req.status === 'forwarded' && (
                              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold">
                                <CheckCircle size={14} /> Active
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-slate-400">
                      <MessageSquare
                        size={48}
                        className="mx-auto mb-4 opacity-20"
                      />
                      <p>
                        No active requests. Looking for something special?
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'messages' && <MessagesView />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestsView;
