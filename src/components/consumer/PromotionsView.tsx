
import React, { useState, useEffect } from 'react';
import { Tag, Bell, Filter, Star, ArrowRight, Zap } from 'lucide-react';
import { UnifiedItem, Listing, PromotionSubscription } from '../../types';
import { StorageService } from '../../services/storageService';
import ListingCard from '../../components/ui/ListingCard';
import BookingModal from '../booking/BookingModal';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORIES = ['All', 'Real Estate', 'Cars', 'Restaurants', 'Services', 'Events'];

const PromotionsView: React.FC = () => {
  const { t } = useLanguage();
  const [promotions, setPromotions] = useState<UnifiedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [subscriptions, setSubscriptions] = useState<PromotionSubscription[]>([
     { id: 's1', label: 'Real Estate Deals', domain: 'Real Estate', isSubscribed: true },
     { id: 's2', label: 'Food & Dining', domain: 'Restaurants', isSubscribed: false },
     { id: 's3', label: 'Car Rentals', domain: 'Cars', isSubscribed: true }
  ]);

  useEffect(() => {
     const load = async () => {
        const all = await StorageService.getListings();
        // Filter for boosted items as promotions
        const boosted = all.filter((i: any) => i.isBoosted === true);
        setPromotions(boosted);
     };
     load();
  }, []);

  const toggleSubscription = (id: string) => {
     setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, isSubscribed: !s.isSubscribed } : s));
  };

  const filteredPromos = activeCategory === 'All' 
     ? promotions 
     : promotions.filter(p => p.domain === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20">
       <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          
          {/* Header */}
          <div className="mb-10 text-center">
             <span className="inline-block px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
                Exclusive Offers
             </span>
             <h1 className="text-4xl font-bold text-slate-900 mb-4">Daily Promotions & Deals</h1>
             <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Hand-picked offers from top island businesses. Subscribe to categories to get notified.
             </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             
             {/* Left Sidebar - Subscriptions */}
             <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-28">
                   <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Bell size={18} /> Deal Alerts
                   </h3>
                   <div className="space-y-3">
                      {subscriptions.map(sub => (
                         <div key={sub.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <span className="text-sm font-medium text-slate-700">{sub.label}</span>
                            <button 
                              onClick={() => toggleSubscription(sub.id)}
                              className={`w-10 h-6 rounded-full relative transition-colors ${sub.isSubscribed ? 'bg-teal-600' : 'bg-slate-200'}`}
                            >
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${sub.isSubscribed ? 'left-5' : 'left-1'}`}></div>
                            </button>
                         </div>
                      ))}
                   </div>
                   <button className="w-full mt-6 py-3 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">
                      Manage Preferences
                   </button>
                </div>
             </div>

             {/* Right Content - Feed */}
             <div className="lg:col-span-3 space-y-6">
                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                   {CATEGORIES.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                           activeCategory === cat 
                           ? 'bg-slate-900 text-white shadow-lg' 
                           : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                         {cat}
                      </button>
                   ))}
                </div>

                {/* Promo Grid */}
                {filteredPromos.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredPromos.map(item => (
                         <div key={item.id} className="relative">
                            <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                               <Zap size={12} className="fill-white"/> HOT DEAL
                            </div>
                            <ListingCard listing={item} onClick={() => setSelectedItem(item)} />
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                      <Tag size={48} className="mx-auto mb-4 text-slate-200"/>
                      <h3 className="font-bold text-lg text-slate-900">No deals found</h3>
                      <p className="text-slate-500">Check back later for new promotions in this category.</p>
                   </div>
                )}
             </div>
          </div>
       </div>

       {selectedItem && (
         <BookingModal 
           listing={selectedItem as Listing} 
           onClose={() => setSelectedItem(null)} 
         />
       )}
    </div>
  );
};

export default PromotionsView;
