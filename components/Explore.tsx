
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_LISTINGS, MOCK_VEHICLES, MOCK_SERVICES, MOCK_RESTAURANTS, MOCK_EVENTS, MOCK_HOTELS } from '../constants';
import ListingCard from './ListingCard';
import BookingModal from './BookingModal';
import { Listing, UnifiedItem, Vehicle, RestaurantItem, HotelItem, Service, EventItem } from '../types';
import { 
  SlidersHorizontal, 
  Home, 
  Compass, 
  ArrowRight,
  Car,
  Hotel,
  Utensils,
  Briefcase,
  MapPin,
  BedDouble,
  Building2,
  Search,
  Check
} from 'lucide-react';

// Top level domains
const DOMAINS = [
  { id: 'Real Estate', label: 'Real Estate', icon: Home },
  { id: 'Hotels', label: 'Hotels', icon: Hotel },
  { id: 'Cars', label: 'Vehicles', icon: Car },
  { id: 'Services', label: 'Services', icon: Briefcase },
  { id: 'Restaurants', label: 'Dining', icon: Utensils }, 
  { id: 'Events', label: 'Events', icon: Compass },
];

const DISTRICTS = ['All', 'Kyrenia', 'Nicosia', 'Famagusta', 'Iskele', 'Lefke', 'Guzelyurt'];
const PROPERTY_TYPES = ['All', 'Villa', 'Apartment', 'Penthouse', 'Bungalow', 'Townhouse', 'Land', 'Commercial'];

const COLLECTIONS = [
  {
    id: 1,
    title: "The Maldives Collection",
    subtitle: "Experience the ultimate overwater luxury.",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=2655&auto=format&fit=crop",
    color: "from-blue-900/80"
  },
  {
    id: 2,
    title: "Mediterranean Gems",
    subtitle: "Historic villas on the cliffs of Amalfi.",
    image: "https://images.unsplash.com/photo-1533104821532-4819093a436f?q=80&w=2670&auto=format&fit=crop",
    color: "from-orange-900/80"
  },
  {
    id: 3,
    title: "Eco-Luxe Adventures",
    subtitle: "Sustainable stays in the heart of nature.",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2670&auto=format&fit=crop",
    color: "from-emerald-900/80"
  }
];

const Explore: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState('Real Estate');
  
  // Dynamic Filter State
  const [filters, setFilters] = useState<Record<string, string>>({
    // Shared / Generic
    type: 'all',     
    category: 'all', 
    
    // Real Estate Specific (101evler style)
    location: 'All',
    propertyCategory: 'All',
    bedrooms: 'Any',
    minPrice: '',
    maxPrice: '',

    // Car Specific
    brand: 'all',    
    year: 'all',     
    transmission: 'all', 
    fuel: 'all',     
    body: 'all'      
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Retain simple price range for other domains if needed, but use min/max for RE
  const [simplePriceLimit, setSimplePriceLimit] = useState(500000); 
  
  const [selectedListing, setSelectedListing] = useState<UnifiedItem | null>(null);
  const [currentCollection, setCurrentCollection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCollection((prev) => (prev + 1) % COLLECTIONS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Reset filters when domain changes
  useEffect(() => {
    setFilters({ 
      type: 'all', category: 'all', brand: 'all', year: 'all', 
      transmission: 'all', fuel: 'all', body: 'all',
      location: 'All', propertyCategory: 'All', bedrooms: 'Any', minPrice: '', maxPrice: ''
    });
  }, [activeDomain]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Unified Data Source
  const getDataSource = () => {
    switch(activeDomain) {
      case 'Real Estate': return MOCK_LISTINGS;
      case 'Hotels': return MOCK_HOTELS;
      case 'Cars': return MOCK_VEHICLES;
      case 'Services': return MOCK_SERVICES;
      case 'Restaurants': return MOCK_RESTAURANTS;
      case 'Events': return MOCK_EVENTS;
      default: return MOCK_LISTINGS;
    }
  };

  // --- FILTER LOGIC ---
  const filteredListings = useMemo(() => {
    const data = getDataSource();
    return data.filter(item => {
      
      // --- REAL ESTATE FILTERING (Robust 101evler style) ---
      if (activeDomain === 'Real Estate') {
         const l = item as Listing;
         
         // 1. Operation Type (The "Don't Touch" part)
         if (filters.type !== 'all' && l.rentalType !== filters.type) return false;

         // 2. Location (District)
         if (filters.location !== 'All') {
            // Check if location string includes the district (e.g. "Bellapais, Kyrenia" includes "Kyrenia")
            if (!l.location.includes(filters.location)) return false;
         }

         // 3. Property Type (Category)
         if (filters.propertyCategory !== 'All') {
            if (l.category !== filters.propertyCategory) return false;
         }

         // 4. Bedrooms
         if (filters.bedrooms !== 'Any') {
            const bedCount = l.bedrooms || 0;
            if (filters.bedrooms === 'Studio' && bedCount !== 0) return false;
            if (filters.bedrooms === '5+' && bedCount < 5) return false;
            if (filters.bedrooms !== 'Studio' && filters.bedrooms !== '5+') {
               if (bedCount !== parseInt(filters.bedrooms)) return false;
            }
         }

         // 5. Price Range (Min/Max)
         if (filters.minPrice && l.price < parseInt(filters.minPrice)) return false;
         if (filters.maxPrice && l.price > parseInt(filters.maxPrice)) return false;
      
         return true;
      } 
      
      // --- OTHER DOMAINS ---
      
      // Global simple price limit for non-RE domains
      if (item.price > simplePriceLimit) return false;

      if (activeDomain === 'Hotels') {
         const h = item as HotelItem;
         if (filters.category !== 'all' && h.hotelType !== filters.category) return false;
      }
      else if (activeDomain === 'Cars') {
         const v = item as Vehicle;
         if (filters.type !== 'all' && v.type !== filters.type) return false;
         if (filters.brand !== 'all' && v.make !== filters.brand) return false;
         if (filters.transmission !== 'all' && v.transmission !== filters.transmission) return false;
         if (filters.fuel !== 'all' && v.fuelType !== filters.fuel) return false;
         if (filters.body !== 'all' && !v.tags.some(t => t.toLowerCase() === filters.body.toLowerCase())) return false;
         
         if (filters.year !== 'all') {
            if (filters.year === 'New' && v.year < 2023) return false;
            if (filters.year === 'Used' && v.year >= 2023) return false;
         }
      }
      else if (activeDomain === 'Restaurants') {
         const r = item as RestaurantItem;
         if (filters.category !== 'all' && r.category !== filters.category) return false;
      }
      else if (activeDomain === 'Services') {
         const s = item as Service;
         if (filters.category !== 'all' && s.category !== filters.category) return false;
      }
      else if (activeDomain === 'Events') {
         const e = item as EventItem;
         if (filters.category !== 'all' && e.eventType !== filters.category) return false;
      }

      return true;
    });
  }, [activeDomain, filters, simplePriceLimit]);

  // --- DYNAMIC FILTER RENDERING (TOP BAR) ---
  const renderDynamicFilters = () => {
    if (activeDomain === 'Real Estate') {
      return (
         <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
            {/* "Don't Touch" - Original Top Level Filters */}
            {['all', 'short-term', 'long-term', 'sale', 'project'].map(opt => (
               <button key={opt} onClick={() => handleFilterChange('type', opt)} 
                  className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${filters.type === opt ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {opt.replace('-', ' ')}
               </button>
            ))}
         </div>
      );
    }
    
    // ... Keep existing filters for other domains ...
    if (activeDomain === 'Hotels') {
       return (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
             {['all', 'Boutique', 'Resort & Casino', 'City Hotel', 'Bungalow'].map(opt => (
                <button key={opt} onClick={() => handleFilterChange('category', opt)} 
                   className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.category === opt ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                   {opt}
                </button>
             ))}
          </div>
       );
    }

    if (activeDomain === 'Cars') {
       return (
          <div className="flex flex-col gap-4 p-1">
             <div className="flex flex-col md:flex-row gap-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {['all', 'rental', 'sale'].map(opt => (
                       <button key={opt} onClick={() => handleFilterChange('type', opt)} 
                          className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.type === opt ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                          {opt === 'all' ? 'All Types' : opt}
                       </button>
                    ))}
                 </div>
                 <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
                 <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="text-xs font-bold text-slate-400 shrink-0">Make:</span>
                    {['all', 'Mercedes', 'Land Rover', 'Ford', 'Toyota', 'BMW'].map(opt => (
                       <button key={opt} onClick={() => handleFilterChange('brand', opt)} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${filters.brand === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {opt}
                       </button>
                    ))}
                 </div>
             </div>
             {/* Extended Car Filters */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                   <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Gear:</span>
                   {['all', 'Automatic', 'Manual'].map(opt => (
                      <button key={opt} onClick={() => handleFilterChange('transmission', opt)} 
                         className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${filters.transmission === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                         {opt === 'all' ? 'Any' : opt}
                      </button>
                   ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                   <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Fuel:</span>
                   {['all', 'Petrol', 'Diesel', 'Electric'].map(opt => (
                      <button key={opt} onClick={() => handleFilterChange('fuel', opt)} 
                         className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${filters.fuel === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                         {opt === 'all' ? 'Any' : opt}
                      </button>
                   ))}
                </div>
                 <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                   <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Body:</span>
                   {['all', 'SUV', 'Sedan', 'Hatchback', 'Van'].map(opt => (
                      <button key={opt} onClick={() => handleFilterChange('body', opt)} 
                         className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${filters.body === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                         {opt === 'all' ? 'Any' : opt}
                      </button>
                   ))}
                </div>
             </div>
          </div>
       );
    }

    if (activeDomain === 'Restaurants') {
      return (
         <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
            {['all', 'Meyhane', 'Seafood', 'Bistro', 'Fine Dining', 'Cafe'].map(opt => (
               <button key={opt} onClick={() => handleFilterChange('category', opt)} 
                  className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.category === opt ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {opt}
               </button>
            ))}
         </div>
      );
    }

    if (activeDomain === 'Events') {
      return (
         <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
            {['all', 'Party', 'Concert', 'Cultural', 'Networking'].map(opt => (
               <button key={opt} onClick={() => handleFilterChange('category', opt)} 
                  className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.category === opt ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {opt}
               </button>
            ))}
         </div>
      );
    }

    return null;
  };

  return (
    <section id="explore" className="py-24 bg-white relative">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Featured Collections Banner */}
        <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-16 shadow-2xl group mx-auto max-w-7xl">
          {COLLECTIONS.map((collection, index) => (
             <div 
               key={collection.id}
               className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentCollection ? 'opacity-100' : 'opacity-0'}`}
             >
               <img 
                 src={collection.image} 
                 alt={collection.title} 
                 className="w-full h-full object-cover transition-transform duration-[10000ms] scale-105 group-hover:scale-110"
               />
               <div className={`absolute inset-0 bg-gradient-to-t ${collection.color} via-black/20 to-transparent opacity-90`}></div>
             </div>
          ))}

          <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3 lg:w-1/2 z-10">
             <div className="overflow-hidden">
                <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-white/90 border border-white/20 rounded-full backdrop-blur-md uppercase shadow-sm">
                  Featured Collection
                </span>
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-xl">
                  {COLLECTIONS[currentCollection].title}
                </h2>
                <p className="text-lg text-white/90 mb-8 font-light leading-relaxed drop-shadow-md max-w-md">
                  {COLLECTIONS[currentCollection].subtitle}
                </p>
                <button className="px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-teal-50 transition-all flex items-center gap-2 group/btn shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                  View Collection <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>
        </div>

        {/* Sticky Filter Navigation */}
        <div className="sticky top-20 z-30 mx-auto max-w-7xl mb-12">
           <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 rounded-2xl p-4 transition-all ring-1 ring-slate-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Domains */}
                  <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide pb-2 md:pb-0 px-1">
                    {DOMAINS.map(dom => {
                      const isActive = activeDomain === dom.id;
                      const Icon = dom.icon;
                      return (
                        <button
                          key={dom.id}
                          onClick={() => setActiveDomain(dom.id)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                            isActive 
                              ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon size={16} />
                          {dom.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Trigger */}
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
                          isFilterOpen 
                            ? 'bg-teal-50 text-teal-700 ring-2 ring-teal-100 shadow-inner' 
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <SlidersHorizontal size={16} />
                        {activeDomain === 'Real Estate' ? 'Advanced Search' : 'Filters'}
                    </button>
                  </div>
              </div>

              {/* Dynamic Sub-Filters (The "Don't Touch" area for RE) */}
              <div className="mt-4">
                {renderDynamicFilters()}
              </div>
              
              {/* EXPANDED FILTER DRAWER */}
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterOpen ? 'max-h-[500px] opacity-100 mt-4 pb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-6 border-t border-slate-100 px-2">
                      
                      {/* --- REAL ESTATE ROBUST FILTERS (101evler Style) --- */}
                      {activeDomain === 'Real Estate' ? (
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2">
                            
                            {/* 1. District / Location */}
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MapPin size={12}/> District</label>
                               <select 
                                  value={filters.location} 
                                  onChange={(e) => handleFilterChange('location', e.target.value)}
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                               >
                                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                               </select>
                            </div>

                            {/* 2. Property Type */}
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Building2 size={12}/> Property Type</label>
                               <select 
                                  value={filters.propertyCategory} 
                                  onChange={(e) => handleFilterChange('propertyCategory', e.target.value)}
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                               >
                                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                               </select>
                            </div>

                            {/* 3. Bedrooms */}
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><BedDouble size={12}/> Bedrooms</label>
                               <div className="flex gap-1">
                                  {['Any', 'Studio', '1', '2', '3', '4', '5+'].map(b => (
                                     <button 
                                       key={b}
                                       onClick={() => handleFilterChange('bedrooms', b)}
                                       className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                                          filters.bedrooms === b 
                                          ? 'bg-slate-900 text-white' 
                                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                       }`}
                                     >
                                        {b}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            {/* 4. Price Min/Max */}
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Price Range (GBP)</label>
                               <div className="flex gap-2">
                                  <input 
                                     type="number" 
                                     placeholder="Min" 
                                     value={filters.minPrice}
                                     onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                     className="w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                  <input 
                                     type="number" 
                                     placeholder="Max" 
                                     value={filters.maxPrice}
                                     onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                                     className="w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                               </div>
                            </div>

                            {/* Search Button (Optional UX enhancement) */}
                            <div className="md:col-span-4 flex justify-end pt-2">
                               <button 
                                 onClick={() => setIsFilterOpen(false)} 
                                 className="bg-teal-600 text-white px-8 py-2 rounded-full font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
                               >
                                  <Search size={16} /> Show Results
                               </button>
                            </div>

                         </div>
                      ) : (
                         // --- GENERIC FILTER FOR OTHER DOMAINS ---
                         <div className="space-y-6">
                           <div className="flex justify-between items-center">
                               <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                 Max Price / Budget
                               </span>
                               <span className="text-sm font-mono font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-md">
                                 £{simplePriceLimit.toLocaleString()}
                               </span>
                           </div>
                           <input 
                               type="range" 
                               min="0" 
                               max={activeDomain === 'Cars' ? 5000 : 500} 
                               step="10"
                               value={simplePriceLimit}
                               onChange={(e) => setSimplePriceLimit(parseInt(e.target.value))}
                               className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 hover:accent-teal-600 transition-colors"
                           />
                         </div>
                      )}
                  </div>
              </div>
           </div>
        </div>

        {/* Listings Grid */}
        <div className="max-w-7xl mx-auto">
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredListings.map(item => (
                <ListingCard 
                  key={item.id} 
                  listing={item as Listing} 
                  onClick={() => setSelectedListing(item)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
              <div className="inline-flex p-4 rounded-full bg-white shadow-sm text-slate-300 mb-4">
                <Compass size={48} strokeWidth={1} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-500 max-w-md mx-auto">Try adjusting your filters or switching categories.</p>
              <button onClick={() => { 
                 setFilters({ 
                    type: 'all', category: 'all', brand: 'all', year: 'all', 
                    transmission: 'all', fuel: 'all', body: 'all',
                    location: 'All', propertyCategory: 'All', bedrooms: 'Any', minPrice: '', maxPrice: ''
                 }); 
                 setSimplePriceLimit(1000000); 
              }} className="mt-4 text-teal-600 font-bold text-sm hover:underline">
                 Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Booking Modal */}
        {selectedListing && (
          <BookingModal 
            listing={selectedListing as Listing} 
            onClose={() => setSelectedListing(null)} 
          />
        )}
      </div>
    </section>
  );
};

export default Explore;
