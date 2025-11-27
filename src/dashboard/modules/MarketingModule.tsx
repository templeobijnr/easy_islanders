
import React, { useState } from 'react';
import { Send, Users, Megaphone, CheckCircle, Plus, Image as ImageIcon, UploadCloud } from 'lucide-react';
import ModuleHeader from '../shared/ModuleHeader';

const MarketingModule: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [channels, setChannels] = useState({ push: true, email: false, whatsapp: false });
  
  const [broadcasts, setBroadcasts] = useState([
     { id: 1, title: 'Summer Sale - 20% Off', audience: 'Past Guests', sent: '2 days ago', openRate: '45%' },
     { id: 2, title: 'New Villa Alert', audience: 'Leads', sent: 'Last week', openRate: '32%' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in">
       <ModuleHeader 
          title="Broadcasts & Promotions" 
          description="Reach your customers directly. Create promotional banners and send them via App Notification, Email, or WhatsApp."
          action={
             <button onClick={() => setIsCreating(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all">
                <Plus size={18} /> New Broadcast
             </button>
          }
       />

       {isCreating && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl mb-8 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
             
             <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                <Megaphone size={24} className="text-teal-600"/> Create Announcement
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject / Title</label>
                      <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all" placeholder="e.g. Limited Time Offer: Free Airport Transfer" />
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Audience</label>
                      <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900">
                         <option>All General Users (Marketplace Wide)</option>
                         <option>My Past Guests</option>
                         <option>Active Leads</option>
                         <option>Newsletter Subscribers</option>
                      </select>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Channels</label>
                      <div className="flex flex-wrap gap-3">
                         <button 
                           onClick={() => setChannels({...channels, push: !channels.push})}
                           className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${channels.push ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                         >
                            App Notification
                         </button>
                         <button 
                           onClick={() => setChannels({...channels, email: !channels.email})}
                           className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${channels.email ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                         >
                            Email Blast
                         </button>
                         <button 
                           onClick={() => setChannels({...channels, whatsapp: !channels.whatsapp})}
                           className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all flex items-center gap-2 ${channels.whatsapp ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200'}`}
                         >
                            WhatsApp (Opt-in)
                         </button>
                      </div>
                   </div>
                </div>

                <div className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Banner Image</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-all group">
                         <UploadCloud size={32} className="mx-auto text-slate-400 mb-2 group-hover:text-teal-500 transition-colors"/>
                         <p className="text-sm text-slate-600 font-medium">Click to upload banner</p>
                         <p className="text-xs text-slate-400">1200x600px recommended</p>
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message Body</label>
                      <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none min-h-[120px] focus:ring-2 focus:ring-slate-900" placeholder="Write your message here..." />
                   </div>
                </div>
             </div>

             <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100 relative z-10">
                <button onClick={() => setIsCreating(false)} className="text-slate-500 font-bold hover:text-slate-800 px-4">Cancel</button>
                <button className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex items-center gap-2 transition-transform hover:scale-105">
                   Send Broadcast <Send size={18}/>
                </button>
             </div>
          </div>
       )}

       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
             <thead className="bg-slate-50 border-b border-slate-100 text-left">
                <tr>
                   <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign Name</th>
                   <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Audience</th>
                   <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Sent Date</th>
                   <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Engagement</th>
                   <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {broadcasts.map(b => (
                   <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 font-bold text-slate-900">{b.title}</td>
                      <td className="p-5 text-sm text-slate-600 flex items-center gap-2"><Users size={14} className="text-slate-400"/> {b.audience}</td>
                      <td className="p-5 text-sm text-slate-500">{b.sent}</td>
                      <td className="p-5 text-sm font-bold text-teal-600">{b.openRate} Open Rate</td>
                      <td className="p-5 text-right">
                         <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-green-100">
                            <CheckCircle size={12}/> Sent
                         </span>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default MarketingModule;
