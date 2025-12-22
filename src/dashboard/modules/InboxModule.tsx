import React, { useState, useEffect } from 'react';
import { Send, Inbox, User, Calendar, Clock, MessageSquare, Phone, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../services/integrations/backend/v1.api';
import { formatDate } from '../../utils/formatters';

type Tab = 'conversations' | 'leads';

interface ChatSession {
   id: string;
   customerName?: string;
   lastMessage?: string;
   lastMessageTime: Date;
   messageCount: number;
}

interface Lead {
   id: string;
   customerName: string;
   customerPhone?: string;
   customerEmail?: string;
   type: 'booking' | 'enquiry';
   details: string;
   status: 'new' | 'contacted' | 'converted' | 'archived';
   createdAt: Date;
   requestedDate?: string;
   requestedTime?: string;
   partySize?: number;
}

const InboxModule: React.FC = () => {
   const { firebaseUser, claims, isLoading: authLoading } = useAuth();
   const [activeTab, setActiveTab] = useState<Tab>('conversations');
   const [activeId, setActiveId] = useState<string | null>(null);
   const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
   const [leads, setLeads] = useState<Lead[]>([]);
   const [chatMessages, setChatMessages] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      if (authLoading) return;
      if (!firebaseUser || claims?.role !== 'owner' || !claims.businessId) {
         setIsLoading(false);
         return;
      }

      if (activeTab === 'conversations') {
         loadChatSessions();
      } else {
         loadLeads();
      }
   }, [authLoading, firebaseUser, claims?.role, claims?.businessId, activeTab]);

   useEffect(() => {
      if (activeId && activeTab === 'conversations') {
         loadChatMessages(activeId);
      }
   }, [activeId, activeTab]);

   const toDate = (value: any): Date => {
      if (!value) return new Date();
      if (value instanceof Date) return value;
      if (typeof value?.toDate === 'function') return value.toDate();
      const seconds = value?._seconds ?? value?.seconds;
      if (typeof seconds === 'number') return new Date(seconds * 1000);
      if (typeof value === 'string') {
         const d = new Date(value);
         return Number.isNaN(d.getTime()) ? new Date() : d;
      }
      return new Date();
   };

   const loadChatSessions = async () => {
      if (!firebaseUser) return;
      setIsLoading(true);
      try {
         const data = await fetchWithAuth<any>(firebaseUser, '/owner/inbox?limit=50');
         const sessions: ChatSession[] = (data.sessions || []).map((s: any) => ({
            id: s.id,
            customerName: s.customerName || 'Anonymous Visitor',
            lastMessage: s.lastMessage || 'Started a conversation',
            lastMessageTime: toDate(s.lastMessageAt),
            messageCount: s.messageCount || 0
         }));
         setChatSessions(sessions);
      } catch (error) {
         console.error('Failed to load chat sessions:', error);
      } finally {
         setIsLoading(false);
      }
   };

   const loadLeads = async () => {
      if (!firebaseUser) return;
      setIsLoading(true);
      try {
         const data = await fetchWithAuth<any>(firebaseUser, '/owner/leads?limit=50');
         const loaded: Lead[] = (data.leads || []).map((l: any) => ({
            id: l.id,
            customerName: l.name || 'Unknown',
            customerPhone: l.phoneE164,
            customerEmail: l.email,
            type: 'enquiry' as const,
            details: l.message || 'Lead captured',
            status: l.status || 'new',
            createdAt: toDate(l.createdAt)
         }));

         setLeads(loaded);
      } catch (error) {
         console.error('Failed to load leads:', error);
      } finally {
         setIsLoading(false);
      }
   };

   const loadChatMessages = async (sessionId: string) => {
      if (!firebaseUser) return;
      try {
         const data = await fetchWithAuth<any>(firebaseUser, `/owner/inbox/${sessionId}/messages?limit=200`);
         const messages = (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            content: m.text,
            timestamp: toDate(m.createdAt),
            sources: m.sources
         }));
         setChatMessages(messages);
      } catch (error) {
         console.error('Failed to load messages:', error);
         setChatMessages([]);
      }
   };

   const formatTime = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
   };

   const activeSession = chatSessions.find(s => s.id === activeId);
   const activeLead = leads.find(l => l.id === activeId);

   if (!authLoading && (!firebaseUser || claims?.role !== 'owner' || !claims.businessId)) {
      return (
         <div className="p-8 text-center text-slate-500">
            Claim your business to view your inbox.
         </div>
      );
   }

   return (
      <div className="h-[calc(100vh-60px)] flex flex-col md:flex-row bg-slate-50 overflow-hidden animate-in fade-in">

         {/* LEFT PANE: LIST */}
         <div className="w-full md:w-1/3 max-w-sm bg-white border-r border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b border-slate-100">
               <h2 className="text-xl font-bold text-slate-900 mb-4">Inbox</h2>
               <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                     onClick={() => { setActiveTab('conversations'); setActiveId(null); }}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'conversations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     <MessageSquare size={14} className="inline mr-1" /> Chats
                  </button>
                  <button
                     onClick={() => { setActiveTab('leads'); setActiveId(null); }}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'leads' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     <Phone size={14} className="inline mr-1" /> Leads
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto">
               {isLoading ? (
                  <div className="p-8 text-center">
                     <Loader2 className="animate-spin text-slate-400 mx-auto" size={24} />
                  </div>
               ) : activeTab === 'conversations' ? (
                  chatSessions.length === 0 ? (
                     <div className="p-8 text-center text-slate-400">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No conversations yet</p>
                        <p className="text-xs mt-1">Chats will appear here when customers message your agent</p>
                     </div>
                  ) : (
                     chatSessions.map(session => (
                        <div
                           key={session.id}
                           onClick={() => setActiveId(session.id)}
                           className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${activeId === session.id ? 'bg-slate-50 border-l-4 border-l-teal-500' : ''}`}
                        >
                           <div className="flex justify-between mb-1">
                              <span className="font-bold text-sm text-slate-900">{session.customerName}</span>
                              <span className="text-[10px] text-slate-400">{formatTime(session.lastMessageTime)}</span>
                           </div>
                           <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
                           <div className="text-[10px] text-slate-400 mt-1">{session.messageCount} messages</div>
                        </div>
                     ))
                  )
               ) : (
                  leads.length === 0 ? (
                     <div className="p-8 text-center text-slate-400">
                        <Phone size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No leads yet</p>
                        <p className="text-xs mt-1">Bookings and enquiries will appear here</p>
                     </div>
                  ) : (
                     leads.map(lead => (
                        <div
                           key={lead.id}
                           onClick={() => setActiveId(lead.id)}
                           className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${activeId === lead.id ? 'bg-slate-50 border-l-4 border-l-purple-500' : ''}`}
                        >
                           <div className="flex justify-between mb-1">
                              <span className="font-bold text-sm text-slate-900">{lead.customerName}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.type === 'booking' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                 {lead.type}
                              </span>
                           </div>
                           <p className="text-xs text-slate-500 truncate">{lead.details}</p>
                           <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                              <Calendar size={10} /> {formatTime(lead.createdAt)}
                              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${lead.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                 {lead.status}
                              </span>
                           </div>
                        </div>
                     ))
                  )
               )}
            </div>
         </div>

         {/* RIGHT PANE: DETAIL */}
         <div className="flex-1 flex flex-col bg-slate-50/50 relative h-full overflow-hidden">
            {activeTab === 'conversations' && activeSession ? (
               // CHAT DETAIL
               <>
                  <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                           <User size={20} className="text-slate-500" />
                        </div>
                        <div>
                           <div className="font-bold text-slate-900">{activeSession.customerName}</div>
                           <div className="text-xs text-slate-500">{activeSession.messageCount} messages</div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                     {chatMessages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                           <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                           Loading messages...
                        </div>
                     ) : (
                        chatMessages.map((msg, idx) => (
                           <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3 rounded-2xl max-w-md text-sm shadow-sm ${msg.role === 'user'
                                 ? 'bg-slate-900 text-white rounded-br-none'
                                 : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                 }`}>
                                 {msg.content || msg.text}
                              </div>
                           </div>
                        ))
                     )}
                  </div>

                  <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500">
                     Read-only view • Agent conversations are automated
                  </div>
               </>
            ) : activeTab === 'leads' && activeLead ? (
               // LEAD DETAIL
               <div className="flex-1 p-8 overflow-y-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h2 className="text-2xl font-bold text-slate-900 mb-1">{activeLead.customerName}</h2>
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${activeLead.type === 'booking' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {activeLead.type}
                           </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${activeLead.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                           {activeLead.status}
                        </span>
                     </div>

                     <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="p-4 bg-slate-50 rounded-xl">
                           <h3 className="font-bold text-slate-900 mb-3">Contact Information</h3>
                           {activeLead.customerPhone && (
                              <a href={`tel:${activeLead.customerPhone}`} className="flex items-center gap-3 text-slate-700 mb-2 hover:text-blue-600">
                                 <Phone size={16} /> {activeLead.customerPhone}
                              </a>
                           )}
                           {activeLead.customerEmail && (
                              <a href={`mailto:${activeLead.customerEmail}`} className="flex items-center gap-3 text-slate-700 hover:text-blue-600">
                                 <Send size={16} /> {activeLead.customerEmail}
                              </a>
                           )}
                        </div>

                        {/* Request Details */}
                        <div className="p-4 border border-slate-100 rounded-xl">
                           <h3 className="font-bold text-slate-900 mb-3">Request Details</h3>
                           <p className="text-slate-600">{activeLead.details}</p>
                           {activeLead.requestedDate && (
                              <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                                 <Calendar size={14} /> {activeLead.requestedDate}
                                 {activeLead.requestedTime && <><Clock size={14} className="ml-2" /> {activeLead.requestedTime}</>}
                              </div>
                           )}
                        </div>

                        <div className="text-xs text-slate-400">
                           Received {formatDate(activeLead.createdAt)}
                        </div>
                     </div>

                     <div className="mt-8 flex gap-3">
                        {activeLead.customerPhone && (
                           <a
                              href={`https://wa.me/${activeLead.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 text-center flex items-center justify-center gap-2"
                           >
                              <ExternalLink size={16} /> WhatsApp
                           </a>
                        )}
                        <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
                           <CheckCircle2 size={16} /> Mark Contacted
                        </button>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <Inbox size={32} className="text-slate-300" />
                  </div>
                  <p>Select a {activeTab === 'conversations' ? 'chat' : 'lead'} to view details</p>
               </div>
            )}
         </div>
      </div>
   );
};

export default InboxModule;
