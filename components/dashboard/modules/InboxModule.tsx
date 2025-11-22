
import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Inbox, User, MapPin, Tag, AlertTriangle, ShieldAlert } from 'lucide-react';
import ModuleHeader from '../shared/ModuleHeader';
import { StorageService } from '../../../services/storageService';

const InboxModule: React.FC = () => {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     const load = async () => {
        const data = await StorageService.getConversations();
        setConversations(data);
     };
     load();
  }, []);

  const activeChat = conversations.find(c => c.id === activeConversation);

  // SAFETY: Phone Number Blocking Regex
  const PHONE_REGEX = /\b[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}\b/g;

  const handleSend = async () => {
    if (!replyText.trim() || !activeChat) return;

    if (PHONE_REGEX.test(replyText)) {
       setWarningMsg("For safety, please do not exchange phone numbers directly in the chat.");
       setTimeout(() => setWarningMsg(null), 4000);
       return;
    }

    const updatedChat = {
        ...activeChat,
        msg: replyText, // Simplified: just updating last message
        time: 'Just now',
        unread: false
    };
    
    // Optimistic update
    setConversations(prev => prev.map(c => c.id === activeChat.id ? updatedChat : c));
    
    // Save to Firestore
    await StorageService.saveConversation(updatedChat);
    
    setReplyText('');
  };

  return (
    <div className="animate-in fade-in h-[calc(100vh-100px)] flex flex-col">
       <ModuleHeader 
          title="Messages" 
          description="Communicate safely with leads. Listings context is shown automatically." 
       />

       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex overflow-hidden relative">
          
          {warningMsg && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-200 text-red-700 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in">
                <ShieldAlert size={18} />
                <span className="text-sm font-bold">{warningMsg}</span>
             </div>
          )}

          <div className="w-1/3 border-r border-slate-100 flex flex-col bg-white">
             <div className="p-4 border-b border-slate-100">
                <input placeholder="Search messages..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
             </div>
             <div className="flex-1 overflow-y-auto">
                {conversations.length > 0 ? conversations.map(c => (
                   <div 
                      key={c.id} 
                      onClick={() => setActiveConversation(c.id)}
                      className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group ${activeConversation === c.id ? 'bg-slate-50 border-l-4 border-l-teal-500' : ''}`}
                   >
                      <div className="flex justify-between mb-1">
                         <span className={`font-bold text-sm ${c.unread ? 'text-slate-900' : 'text-slate-600'}`}>{c.name}</span>
                         <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                      <p className={`text-xs truncate ${c.unread ? 'font-bold text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>{c.msg}</p>
                      {c.relatedListing && (
                         <div className="mt-2 flex items-center gap-1 text-[10px] text-teal-600 font-medium bg-teal-50 w-fit px-2 py-0.5 rounded">
                            <Tag size={10} /> {c.relatedListing.title}
                         </div>
                      )}
                   </div>
                )) : (
                    <div className="p-6 text-center text-slate-400 text-sm">No conversations found.</div>
                )}
             </div>
          </div>

          <div className="flex-1 flex flex-col bg-slate-50/50 relative">
             {activeChat ? (
                <>
                   <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User size={20} className="text-slate-500"/>
                         </div>
                         <div>
                            <div className="font-bold text-slate-900">{activeChat.name}</div>
                            <div className="text-xs text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online</div>
                         </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18}/></button>
                   </div>
                   
                   <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                       {activeChat.relatedListing && (
                          <div className="flex justify-center mb-6">
                             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex gap-3 max-w-md w-full hover:shadow-md transition-shadow cursor-pointer">
                                <img src={activeChat.relatedListing.image} className="w-16 h-16 rounded-lg object-cover" />
                                <div className="flex-1">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Inquiry about</div>
                                   <div className="font-bold text-slate-900 text-sm">{activeChat.relatedListing.title}</div>
                                   <div className="flex justify-between mt-1">
                                      <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {activeChat.relatedListing.location}</span>
                                      <span className="text-xs font-bold text-teal-600">{activeChat.relatedListing.price}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}

                      <div className="flex justify-start">
                         <div className="bg-white border border-slate-200 text-slate-700 p-3 rounded-2xl rounded-tl-none max-w-xs text-sm shadow-sm">
                            {activeChat.msg}
                         </div>
                      </div>
                   </div>

                   <div className="p-4 bg-white border-t border-slate-200">
                      <div className="flex gap-2 relative">
                         <input 
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all" 
                           placeholder="Type a message..." 
                         />
                         <button 
                            onClick={handleSend}
                            disabled={!replyText.trim()}
                            className="p-3 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                         >
                            <Send size={18}/>
                         </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">
                         <ShieldAlert size={10} className="inline mb-0.5 mr-1"/>
                         Phone numbers are automatically blocked for security. Use official booking tools.
                      </p>
                   </div>
                </>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Inbox size={32} className="text-slate-300"/>
                   </div>
                   <p>Select a conversation to start chatting</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default InboxModule;
