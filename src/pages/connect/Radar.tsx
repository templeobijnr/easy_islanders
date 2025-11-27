
import React from 'react';
import { Calendar, ChevronRight, MapPin, Trophy } from 'lucide-react';
import { SocialUser, EventItem } from '../../types';

interface RadarProps {
   topExplorers: SocialUser[];
   upcomingEvents: EventItem[];
   onWave: (user: SocialUser) => void;
   onGetTickets: (event: EventItem) => void;
}

const Radar: React.FC<RadarProps> = ({ topExplorers, upcomingEvents, onWave, onGetTickets }) => {
   return (
      <div className="space-y-6">

         {/* Top Explorers */}
         <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
               <Trophy size={16} className="text-yellow-500" /> Top Explorers
            </h3>
            <div className="space-y-4">
               {topExplorers.slice(0, 3).map((user, index) => (
                  <div key={user.id} className="flex items-center gap-3">
                     <div className="relative">
                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt={user.name} />
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                           {index + 1}
                        </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{user.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                           <span className="text-yellow-600 font-bold">{user.vouches} vouches</span>
                        </div>
                     </div>
                     <button
                        onClick={() => onWave(user)}
                        className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors"
                     >
                        Wave 👋
                     </button>
                  </div>
               ))}
            </div>
         </div>

         {/* Upcoming Events */}
         <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Calendar size={16} className="text-purple-500" /> Upcoming
               </h3>
               <button className="text-slate-400 hover:text-slate-600"><ChevronRight size={16} /></button>
            </div>
            <div className="space-y-3">
               {upcomingEvents.slice(0, 2).map(evt => (
                  <div key={evt.id} className="group cursor-pointer">
                     <div className="relative h-24 rounded-xl overflow-hidden mb-2">
                        <img src={evt.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={evt.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-2 left-2 text-white">
                           <div className="font-bold text-sm line-clamp-1">{evt.title}</div>
                           <div className="text-[10px] flex items-center gap-1 opacity-90">
                              <MapPin size={10} /> {evt.venue}
                           </div>
                        </div>
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded">
                           {new Date(evt.date).getDate()} {new Date(evt.date).toLocaleString('default', { month: 'short' })}
                        </div>
                     </div>
                     <button
                        onClick={() => onGetTickets(evt)}
                        className="w-full py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                     >
                        Get Tickets
                     </button>
                  </div>
               ))}
            </div>
         </div>

      </div>
   );
};

export default Radar;
