import React, { useState, useEffect } from 'react';
import { Plus, Filter, MoreHorizontal, Trash2, Edit3, Power, Gauge, Fuel, ShoppingBag, Minus, Calendar, Users, Ticket, Video, PlayCircle, Share2, Utensils, Tag, AlertCircle, Briefcase, Clock, MapPin, CheckCircle } from 'lucide-react';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { Listing, BusinessConfig } from '../../../types';
import PropertyFormModal from '../shared/PropertyFormModal';
import VehicleFormModal from '../shared/VehicleFormModal';
import ProductFormModal from '../shared/ProductFormModal';
import EventFormModal from '../shared/EventFormModal';
import MenuFormModal from '../shared/MenuFormModal';
import ServiceFormModal from '../shared/ServiceFormModal';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatDate } from '../../utils/formatters';

interface OfferingsModuleProps {
   config: BusinessConfig;
}

const OfferingsModule: React.FC<OfferingsModuleProps> = ({ config }) => {
   const { user } = useAuth();
   const [listings, setListings] = useState<any[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editItem, setEditItem] = useState<any | undefined>(undefined);
   const [actionMenuId, setActionMenuId] = useState<string | null>(null);
   const [initialViewMode, setInitialViewMode] = useState<'overview' | 'edit'>('overview');

   const isCarBusiness = config.domain === 'Cars';
   const isRetailBusiness = config.domain === 'Marketplace';
   const isEventBusiness = config.domain === 'Events';
   const isRestaurant = config.domain === 'Restaurants';
   const isServiceBusiness = config.domain === 'Services';

   useEffect(() => {
      loadListings();
      const handleClick = () => setActionMenuId(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
   }, [config.id, user?.id]);

   const loadListings = async () => {
      const data = await StorageService.getListings({ businessId: config.id, ownerUid: user?.id });
      // Filter by domain
      const filtered = data.filter(item => item.domain === config.domain);
      setListings(filtered);
   };

   // Mock Sync
   const handleSync = () => {
      const btn = document.getElementById('sync-btn');
      if (btn) {
         btn.innerText = 'Syncing...';
         setTimeout(() => { btn.innerText = 'Agent Knowledge Updated'; setTimeout(() => btn.innerText = 'Sync to Agent', 2000); }, 1000);
      }
   };

   // ... handleSave, handleDelete ... (omitted for brevity in prompt, but in file I only replace header section)

   return (
      <div className="space-y-6 animate-in fade-in pb-20">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="text-teal-600" /> Agent Offerings
               </h2>
               <p className="text-slate-500 mt-1 max-w-2xl">
                  This is the master list your AI Agent uses to answer questions and make bookings.
                  Ensure prices and descriptions are accurate.
               </p>
            </div>
            <div className="flex gap-3">
               <button
                  id="sync-btn"
                  onClick={handleSync}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
               >
                  <Briefcase size={18} /> Sync to Agent
               </button>
               <button
                  onClick={() => { setEditItem(undefined); setInitialViewMode('edit'); setIsModalOpen(true); }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg transition-all"
               >
                  <Plus size={18} /> Add Offering
               </button>
            </div>
         </div>

         {/* Stats Bar */}
         <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
               <div>
                  <div className="text-2xl font-bold text-slate-900">{listings.length}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Active Items</div>
               </div>
               <CheckCircle className="text-green-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
               <div>
                  <div className="text-2xl font-bold text-slate-900">{listings.filter(l => l.tags?.includes('bestseller')).length}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Best Sellers</div>
               </div>
               <Tag className="text-purple-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
               <div>
                  <div className="text-2xl font-bold text-slate-900">100%</div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Data Health</div>
               </div>
               <Gauge className="text-blue-500" size={24} />
            </div>
         </div>

         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Master Inventory</div>
               <button className="text-slate-400 hover:text-slate-600"><Filter size={20} /></button>
            </div>
            <table className="w-full">
               <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                     <th className="px-6 py-4 text-left">Image</th>
                     <th className="px-6 py-4 text-left">
                        {isCarBusiness ? 'Vehicle Info' : isRetailBusiness ? 'Product & Stock' : isEventBusiness ? 'Event & Sales' : isRestaurant ? 'Dish Name' : isServiceBusiness ? 'Service Info' : 'Title'}
                     </th>
                     <th className="px-6 py-4 text-left">{isEventBusiness ? 'Date' : 'Price'}</th>
                     <th className="px-6 py-4 text-left">
                        {isCarBusiness ? 'Specs' : isRetailBusiness ? 'SKU' : isEventBusiness ? 'Venue' : isRestaurant ? 'Category' : isServiceBusiness ? 'Area & Time' : 'Location'}
                     </th>
                     <th className="px-6 py-4 text-left">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {listings.map(l => (
                     <tr
                        key={l.id}
                        onClick={() => openOverview(l)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                     >
                        <td className="px-6 py-4 w-24">
                           {isEventBusiness ? (
                              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900">
                                 <img src={l.imageUrl} className="w-full h-full object-cover opacity-80" />
                                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{formatDate(l.date, { month: 'short' })}</span>
                                    <span className="text-lg font-bold leading-none">{l.date ? new Date(l.date).getDate() : '—'}</span>
                                 </div>
                              </div>
                           ) : (
                              <img src={l.imageUrl} className="w-16 h-12 rounded-lg object-cover bg-slate-200" />
                           )}
                        </td>
                        <td className="px-6 py-4">
                           {isCarBusiness ? (
                              <div className="font-bold text-slate-900 text-sm">{l.title || `${l.make} ${l.model}`}</div>
                           ) : isRetailBusiness ? (
                              renderProductDetails(l)
                           ) : isEventBusiness ? (
                              renderEventDetails(l)
                           ) : isServiceBusiness ? (
                              renderServiceDetails(l)
                           ) : isRestaurant ? (
                              <div>
                                 <div className="font-bold text-slate-900 text-sm">{l.title}</div>
                                 {l.dietary && l.dietary.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                       {l.dietary.slice(0, 2).map((d: string) => (
                                          <span key={d} className="text-[9px] bg-green-50 text-green-700 px-1 rounded uppercase font-bold">{d}</span>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           ) : (
                              <div>
                                 <div className="font-bold text-slate-900 text-sm">{l.title}</div>
                                 <div className="text-xs text-slate-500">{l.category}</div>
                              </div>
                           )}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-bold">
                           {isEventBusiness ? (
                              <div className="flex flex-col">
                                 <span>{formatDate(l.date, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                 <span className="text-xs text-slate-400 font-normal">{l.startTime}</span>
                              </div>
                           ) : (
                              <>
                                 {formatMoney(l.price)}
                                 <span className="text-xs text-slate-400 font-normal ml-1">
                                    {isCarBusiness && l.type === 'rental' ? '/day' :
                                       isServiceBusiness && l.pricingModel === 'hourly' ? '/hr' : ''}
                                 </span>
                              </>
                           )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                           {isCarBusiness ? renderVehicleDetails(l) :
                              isRetailBusiness ? (l.sku || '-') :
                                 isEventBusiness ? l.venue :
                                    isRestaurant ? l.category :
                                       isServiceBusiness ? (
                                          <div className="flex flex-col gap-1">
                                             <div className="flex items-center gap-1"><MapPin size={12} /> {l.location}</div>
                                             <div className="flex items-center gap-1 text-slate-400 text-xs"><Clock size={12} /> {l.durationMinutes}m</div>
                                          </div>
                                       ) : l.location}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'out_of_stock' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${l.status === 'active' ? 'bg-green-500' : l.status === 'out_of_stock' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                              {l.status === 'out_of_stock' ? 'Sold Out' : l.status || 'Draft'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                           <div className="relative inline-block">
                              <button
                                 onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === l.id ? null : l.id); }}
                                 className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                 <MoreHorizontal size={18} />
                              </button>

                              {actionMenuId === l.id && (
                                 <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                    {isEventBusiness && (
                                       <button className="w-full text-left px-4 py-3 text-sm font-medium text-purple-600 hover:bg-purple-50 flex items-center gap-2">
                                          <Share2 size={14} /> Promote
                                       </button>
                                    )}
                                    <button onClick={(e) => openEdit(e, l)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                       <Edit3 size={14} /> Edit Details
                                    </button>
                                    <button onClick={(e) => handleToggleStatus(e, l)} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                       <Power size={14} className={l.status === 'active' ? 'text-red-500' : 'text-green-500'} />
                                       {l.status === 'active' ? 'Set Inactive' : 'Set Active'}
                                    </button>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button onClick={(e) => handleDelete(e, l.id)} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                                       <Trash2 size={14} /> Delete
                                    </button>
                                 </div>
                              )}
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {listings.length === 0 && (
               <div className="text-center py-12 text-slate-400">
                  {isRestaurant ? <Utensils size={40} className="mx-auto mb-2 opacity-20" /> : isServiceBusiness ? <Briefcase size={40} className="mx-auto mb-2 opacity-20" /> : null}
                  No items found. {isEventBusiness ? 'Create your first event!' : isRestaurant ? 'Add items to your menu!' : isServiceBusiness ? 'Add your first service!' : 'Add your first one!'}
               </div>
            )}
         </div>

         {isCarBusiness ? (
            <VehicleFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
               initialView={initialViewMode}
            />
         ) : isRetailBusiness ? (
            <ProductFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
            />
         ) : isEventBusiness ? (
            <EventFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
            />
         ) : isRestaurant ? (
            <MenuFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
            />
         ) : isServiceBusiness ? (
            <ServiceFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
            />
         ) : (
            <PropertyFormModal
               isOpen={isModalOpen}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSave}
               initialData={editItem}
               isEditMode={!!editItem}
               initialView={initialViewMode}
            />
         )}
      </div>
   );
};

export default OfferingsModule;
