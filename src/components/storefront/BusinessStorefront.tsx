
import React, { useState, useEffect } from 'react';
import { MapPin, Star, Share, Building2 } from 'lucide-react';
import { BusinessConfig, Listing } from '../../types';
import { StorageService } from '../../services/storageService';
import ListingCard from '../../components/ui/ListingCard';

interface BusinessStorefrontProps {
  config: BusinessConfig;
  customData?: { name: string; bio: string; coverImage: string };
}

const BusinessStorefront: React.FC<BusinessStorefrontProps> = ({ config, customData }) => {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
     const load = async () => {
        const data = await StorageService.getListings();
        setListings(data as Listing[]); // Filter by business ID in real app
     };
     load();
  }, []);

  const data = customData || {
     name: config.businessName,
     bio: "Welcome to our official collection.",
     coverImage: "https://images.unsplash.com/photo-1512918760532-3ed868d86b5d?q=80&w=2670&auto=format&fit=crop"
  };

  return (
    <div className="bg-slate-50 min-h-[600px]">
       {/* Cover */}
       <div className="h-64 w-full relative">
          <img src={data.coverImage} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full p-8 container mx-auto">
             <div className="flex justify-between items-end">
                <div className="flex items-end gap-4">
                   <div className="w-24 h-24 bg-white p-1 rounded-2xl shadow-xl -mb-12 relative z-10">
                      <div className="w-full h-full bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                         <Building2 size={32} />
                      </div>
                   </div>
                   <div className="text-white mb-2">
                      <h1 className="text-3xl font-bold">{data.name}</h1>
                      <p className="text-slate-200 text-sm opacity-90">{config.domain} Specialist</p>
                   </div>
                </div>
                <button className="bg-white/20 hover:bg-white/30 text-white backdrop-blur px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                   <Share size={16} /> Share
                </button>
             </div>
          </div>
       </div>

       <div className="container mx-auto px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             {/* Sidebar Info */}
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-900 mb-2">About Us</h3>
                   <p className="text-sm text-slate-600 leading-relaxed">{data.bio}</p>
                   <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1 text-yellow-500 text-sm font-bold">
                      <Star size={16} className="fill-yellow-500" /> 4.9 (128 Reviews)
                   </div>
                </div>
             </div>

             {/* Listings Grid */}
             <div className="lg:col-span-3">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Our Listings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {listings.slice(0, 4).map(l => (
                      <ListingCard key={l.id} listing={l} />
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default BusinessStorefront;
