import React from 'react';
import {
   Eye, MapPin, MessageSquare, Calendar, Inbox,
   TrendingUp, User, AlertCircle
} from 'lucide-react';
import { Listing } from '../../../types';
import { formatMoney } from '../../utils/formatters';

interface PerformanceTableProps {
   listings: Listing[];
   filterType: string; // 'daily', 'long', 'sale', etc.
}

// Helper to generate mock "Live" data for visualization since backend is static
const getLiveMetrics = (listing: Listing) => {
   // Deterministic pseudo-random based on ID length/char codes
   const seed = listing.id.length + listing.title.length;

   return {
      requests: seed % 5, // 0-4 new requests
      bookings: seed % 3, // 0-2 new bookings today
      messages: (seed * 2) % 8, // 0-7 unread messages
      utilization: 40 + (seed * 5) % 55, // 40-95% utilization
      revenue: listing.price * (1 + (seed % 4)), // Mock revenue
   };
};

const PerformanceTable: React.FC<PerformanceTableProps> = ({ listings, filterType }) => {

   const getUtilizationLabel = () => {
      if (filterType === 'daily' || filterType === 'long') return 'Occupancy';
      if (filterType === 'sale') return 'Lead Interest';
      return 'Utilization'; // Default/Restaurants
   };

   const getUtilizationColor = (val: number) => {
      if (val > 80) return 'bg-emerald-500';
      if (val > 50) return 'bg-blue-500';
      return 'bg-amber-500';
   };

   return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
               <h3 className="font-bold text-lg text-slate-900 capitalize flex items-center gap-2">
                  <TrendingUp size={20} className="text-teal-600" />
                  {filterType === 'all' ? 'Overall' : filterType} Performance
               </h3>
               <p className="text-slate-500 text-xs mt-1">Live tracking of bookings, requests, and asset utilization.</p>
            </div>

            <div className="flex gap-2">
               <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1 border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> Live Data
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
               <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-4 text-left">Property / Item</th>
                     <th className="px-6 py-4 text-left">Status & Location</th>
                     <th className="px-6 py-4 text-left">Live Activity</th>
                     <th className="px-6 py-4 text-left w-48">{getUtilizationLabel()}</th>
                     <th className="px-6 py-4 text-right">Views</th>
                     <th className="px-6 py-4 text-right">Price</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {listings.length > 0 ? listings.map((l) => {
                     const metrics = getLiveMetrics(l);

                     return (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                           {/* PROPERTY INFO */}
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                 <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm group-hover:shadow-md transition-all">
                                    <img src={l.imageUrl} className="w-full h-full object-cover" alt={l.title} />
                                    {metrics.bookings > 0 && (
                                       <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/90 text-white text-[9px] font-bold text-center py-0.5">
                                          +{metrics.bookings} Booked
                                       </div>
                                    )}
                                 </div>
                                 <div>
                                    <div className="font-bold text-slate-900 text-sm line-clamp-1 w-40">{l.title}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                       {l.category}
                                    </div>
                                 </div>
                              </div>
                           </td>

                           {/* STATUS & LOCATION */}
                           <td className="px-6 py-4">
                              <div className="flex flex-col items-start gap-1.5">
                                 <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                                    <MapPin size={12} className="text-slate-400" /> {l.location}
                                 </div>
                                 <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${l.rentalType === 'project' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                       l.rentalType === 'sale' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                          'bg-green-50 text-green-700 border-green-100'
                                    }`}>
                                    {l.rentalType}
                                 </span>
                              </div>
                           </td>

                           {/* LIVE ACTIVITY COUNTERS */}
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 {/* Requests */}
                                 <div className={`flex flex-col items-center justify-center w-10 p-1 rounded-lg border ${metrics.requests > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                    <div className="relative">
                                       <Inbox size={16} className={metrics.requests > 0 ? 'text-blue-600' : 'text-slate-400'} />
                                       {metrics.requests > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                                    </div>
                                    <span className="text-[9px] font-bold mt-1 text-slate-600">{metrics.requests}</span>
                                 </div>

                                 {/* Bookings */}
                                 <div className={`flex flex-col items-center justify-center w-10 p-1 rounded-lg border ${metrics.bookings > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                    <Calendar size={16} className={metrics.bookings > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span className="text-[9px] font-bold mt-1 text-slate-600">{metrics.bookings}</span>
                                 </div>

                                 {/* Messages */}
                                 <div className={`flex flex-col items-center justify-center w-10 p-1 rounded-lg border ${metrics.messages > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                    <MessageSquare size={16} className={metrics.messages > 0 ? 'text-orange-600' : 'text-slate-400'} />
                                    <span className="text-[9px] font-bold mt-1 text-slate-600">{metrics.messages}</span>
                                 </div>
                              </div>
                           </td>

                           {/* UTILIZATION BAR */}
                           <td className="px-6 py-4">
                              <div className="w-full">
                                 <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span>Capacity</span>
                                    <span className={metrics.utilization > 80 ? 'text-emerald-600' : ''}>{metrics.utilization}%</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                       className={`h-full rounded-full ${getUtilizationColor(metrics.utilization)}`}
                                       style={{ width: `${metrics.utilization}%` }}
                                    ></div>
                                 </div>
                              </div>
                           </td>

                           {/* VIEWS */}
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 font-bold text-slate-700 text-sm">
                                 <Eye size={14} className="text-slate-400" />
                                 {l.views || 0}
                              </div>
                              {l.views && l.views > 50 && (
                                 <div className="text-[10px] text-emerald-600 font-medium flex items-center justify-end gap-1 mt-0.5">
                                    <TrendingUp size={10} /> Trending
                                 </div>
                              )}
                           </td>

                           {/* PRICE */}
                           <td className="px-6 py-4 text-right">
                              <div className="font-mono text-sm font-bold text-slate-900">{formatMoney(l.price)}</div>
                              <div className="text-[10px] text-slate-400 font-medium">per unit</div>
                           </td>
                        </tr>
                     );
                  }) : (
                     <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                           <div className="flex flex-col items-center">
                              <AlertCircle size={32} className="mb-2 opacity-50" />
                              <p>No listings found for this category.</p>
                           </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-center">
            <button className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider">View All Reports</button>
         </div>
      </div>
   );
};

export default PerformanceTable;
