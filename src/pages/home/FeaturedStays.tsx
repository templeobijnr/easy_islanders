
import React, { useState, useEffect } from 'react';
import { Star, MapPin, ArrowRight } from 'lucide-react';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { UnifiedItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../../utils/formatters';

interface FeaturedStaysProps {
   onSeeAll?: () => void;
}

const FeaturedStays: React.FC<FeaturedStaysProps> = ({ onSeeAll }) => {
   const navigate = useNavigate();
   const [stays, setStays] = useState<UnifiedItem[]>([]);

   useEffect(() => {
      const load = async () => {
         const all = await StorageService.getListings();
         // Filter for items with rating >= 4.8 or flagged as boosted in future
         const featured = all.filter(i => (i as any).rating && (i as any).rating >= 4.8 && i.domain !== 'Cars').slice(0, 4);
         setStays(featured);
      };
      load();
   }, []);

   if (stays.length === 0) return null;

   return (
      <section className="py-24 bg-white">
         <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
               <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Stay in Style</h2>
                  <p className="text-slate-500 text-lg leading-relaxed">
                     Hand-picked accommodations for the discerning traveler. From mountain vineyards to seafront luxury, experience the true essence of island living.
                  </p>
               </div>
               <button
                  onClick={() => (onSeeAll ? onSeeAll() : navigate('/discover'))}
                  className="hidden md:flex items-center gap-2 font-bold text-teal-600 hover:text-teal-700 transition-colors mt-6 md:mt-0"
               >
                  View All Stays <ArrowRight size={18} />
               </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {stays.map(stay => (
                  <div key={stay.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-slate-100">
                     <div className="aspect-[4/5] relative overflow-hidden">
                        <img src={stay.imageUrl} alt={stay.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute top-4 left-4 z-10">
                           <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-bold uppercase tracking-wide rounded-full text-slate-900 shadow-sm">
                              Featured
                           </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                           <h3 className="text-white font-bold text-lg mb-1 leading-tight">{stay.title}</h3>
                           <div className="flex items-center justify-between">
                              <span className="text-white/80 text-xs flex items-center gap-1"><MapPin size={12} /> {stay.location}</span>
                              {stay.rating && (
                                 <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                                    <Star size={12} className="fill-yellow-400" /> {stay.rating}
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="p-4 flex justify-between items-center border-t border-slate-50 bg-white relative z-20">
                        <div>
                           <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Starting from</span>
                           {typeof stay.price === 'number' ? (
                              <div className="font-bold text-slate-900 text-lg">
                                 {formatMoney(stay.price, '£')}{' '}
                                 <span className="text-slate-400 text-xs font-normal">
                                    {stay.domain === 'Hotels' ? '/ night' : ''}
                                 </span>
                              </div>
                           ) : (
                              <div className="font-bold text-slate-900 text-sm">
                                 Price on request
                              </div>
                           )}
                        </div>
                        <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                           <ArrowRight size={16} />
                        </button>
                     </div>
                  </div>
               ))}
            </div>

            <div className="mt-8 text-center md:hidden">
               <button
                  onClick={() => (onSeeAll ? onSeeAll() : navigate('/discover'))}
                  className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold w-full"
               >
                  Explore All Stays
               </button>
            </div>
         </div>
      </section>
   );
};

export default FeaturedStays;
