
import React from 'react';
import { Trophy, Star, Award, ShieldCheck } from 'lucide-react';
import { SocialUser } from '../../types';

interface PassportCardProps {
   user: SocialUser;
   onViewStamps?: () => void;
}

const PassportCard: React.FC<PassportCardProps> = ({ user, onViewStamps }) => {

   const getRankColor = (rank: string) => {
      switch (rank) {
         case 'Local Legend': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-200';
         case 'Islander': return 'bg-gradient-to-r from-teal-400 to-emerald-500 text-white border-teal-200';
         default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
   };

   return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-24 overflow-hidden relative">
         {/* Background Pattern */}
         <div className="absolute top-0 left-0 w-full h-24 bg-slate-900 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

         <div className="flex flex-col items-center text-center relative z-10">
            {/* Avatar with Rank Ring */}
            <div className="relative mb-4 group">
               <div className={`w-24 h-24 rounded-full p-1 ${getRankColor(user.rank)}`}>
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover border-4 border-white bg-white" />
               </div>
               <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
                  <div className="bg-yellow-400 text-white p-1 rounded-full">
                     <Trophy size={14} className="fill-white" />
                  </div>
               </div>
            </div>

            <h2 className="font-bold text-xl text-slate-900 mb-1">{user.name}</h2>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4 ${user.rank === 'Local Legend' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
               {user.rank}
            </div>

            {/* Trust Score (Vouches) */}
            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                     <ShieldCheck size={12} /> Credibility
                  </span>
                  <span className="text-lg font-bold text-slate-900">{user.trustScore}%</span>
               </div>
               <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${user.trustScore}%` }}></div>
               </div>
               <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" /> {user.vouches} vouches received
               </div>
            </div>

            {/* Stamps Grid */}
            <div className="w-full">
               <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">My Stamps</h4>
                  <button onClick={onViewStamps} className="text-xs text-teal-600 font-bold hover:underline cursor-pointer">View All</button>
               </div>
               <div className="grid grid-cols-4 gap-2">
                  {user.passportStamps.slice(0, 4).map(stamp => (
                     <div key={stamp.id} className="aspect-square rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl" title={stamp.locationName}>
                        {stamp.icon}
                     </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - user.passportStamps.length) }).map((_, i) => (
                     <div key={`empty-${i}`} className="aspect-square rounded-xl bg-slate-50 border border-dashed border-slate-200"></div>
                  ))}
               </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 w-full flex justify-between text-xs text-slate-500">
               <span>{user.points} Points</span>
               <span>Next: 2500</span>
            </div>
         </div>
      </div>
   );
};

export default PassportCard;
