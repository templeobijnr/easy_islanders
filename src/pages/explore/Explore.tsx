
import React, { useState, useMemo, useEffect } from 'react';
import ListingCard from '../../components/ui/ListingCard';
import BookingModal from '../../components/booking/BookingModal';
import ProductDetailModal from '../../components/booking/ProductDetailModal';
import CollectionBanner from './CollectionBanner';
import FilterBar from './FilterBar';
import { Listing, UnifiedItem, Vehicle, HotelItem, RestaurantItem, EventItem, Service } from '../../types';
import { Home, Compass, Car, Hotel, Utensils, Briefcase, Loader2, ShoppingBag, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { StorageService } from '../../services/storageService';

const Explore: React.FC = () => {
   const { t } = useLanguage();

   const DOMAINS = [
      { id: 'Real Estate', label: t('real_estate'), icon: Home },
      { id: 'Marketplace', label: 'Marketplace', icon: ShoppingBag },
      { id: 'Hotels', label: t('hotels'), icon: Hotel },
      { id: 'Cars', label: t('vehicles'), icon: Car },
      { id: 'Services', label: t('services'), icon: Briefcase },
      { id: 'Restaurants', label: t('dining'), icon: Utensils },
      { id: 'Events', label: t('events'), icon: Compass },
      { id: 'Experiences', label: 'Experiences', icon: Star }, // Added Experiences
   ];

   const [activeDomain, setActiveDomain] = useState('Real Estate');
   const [filters, setFilters] = useState<Record<string, string>>({
      type: 'all', category: 'all', location: 'All', propertyCategory: 'All',
      bedrooms: 'Any', minPrice: '', maxPrice: '', brand: 'all', year: 'all',
      transmission: 'all', fuel: 'all', body: 'all'
   });
   const [isFilterOpen, setIsFilterOpen] = useState(false);
   const [simplePriceLimit, setSimplePriceLimit] = useState(500000);
   const [selectedListing, setSelectedListing] = useState<UnifiedItem | null>(null);

   // Data State
   const [allItems, setAllItems] = useState<UnifiedItem[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   // Fetch Data on Mount
   useEffect(() => {
      const fetchData = async () => {
         setIsLoading(true);
         try {
            const items = await StorageService.getListings();
            if (items.length === 0) {
               await StorageService.seedDatabase();
               const seededItems = await StorageService.getListings();
               setAllItems(seededItems);
            } else {
               setAllItems(items);
            }
         } catch (e) {
            console.error("Failed to fetch listings", e);
         } finally {
            setIsLoading(false);
         }
      };
      fetchData();
   }, []);

   useEffect(() => {
      setFilters({
         type: 'all', category: 'all', location: 'All', propertyCategory: 'All',
         bedrooms: 'Any', minPrice: '', maxPrice: '', brand: 'all', year: 'all',
         transmission: 'all', fuel: 'all', body: 'all'
      });
   }, [activeDomain]);

   const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
   };

   const filteredListings = useMemo(() => {
      // Handle "Experiences" domain by mapping it to "Events" or specific items
      const targetDomain = activeDomain === 'Experiences' ? 'Events' : activeDomain;

      const domainItems = allItems.filter(item => item.domain === targetDomain);

      return domainItems.filter(item => {
         // Real Estate Filters
         if (activeDomain === 'Real Estate') {
            const l = item as Listing;
            if (filters.type !== 'all' && l.rentalType !== filters.type) return false;
            if (filters.location !== 'All' && !l.location.includes(filters.location)) return false;
            if (filters.propertyCategory !== 'All' && l.category !== filters.propertyCategory) return false;
            if (filters.bedrooms !== 'Any') {
               const bedCount = l.bedrooms || 0;
               if (filters.bedrooms === 'Studio' && bedCount !== 0) return false;
               if (filters.bedrooms === '5+' && bedCount < 5) return false;
               if (filters.bedrooms !== 'Studio' && filters.bedrooms !== '5+' && bedCount !== parseInt(filters.bedrooms)) return false;
            }
            if (filters.minPrice && l.price < parseInt(filters.minPrice)) return false;
            if (filters.maxPrice && l.price > parseInt(filters.maxPrice)) return false;
            return true;
         }

         // General Price Limit for non-RE
         if (item.price > simplePriceLimit) return false;

         // Car Filters
         if (activeDomain === 'Cars') {
            const v = item as Vehicle;
            if (filters.type !== 'all' && v.type !== filters.type) return false;
            if (filters.brand !== 'all' && v.make !== filters.brand) return false;
            if (filters.transmission !== 'all' && v.transmission !== filters.transmission) return false;
            if (filters.fuel !== 'all' && v.fuelType !== filters.fuel) return false;
            return true;
         }

         // Hotel Filters
         if (activeDomain === 'Hotels') {
            const h = item as HotelItem;
            if (filters.category !== 'all' && h.hotelType !== filters.category) return false;
            return true;
         }

         return true;
      });
   }, [activeDomain, filters, simplePriceLimit, allItems]);

   return (
      <section id="explore" className="py-24 bg-white relative">
         <div className="container mx-auto px-4 md:px-6">
            <CollectionBanner />

            <FilterBar
               activeDomain={activeDomain}
               filters={filters}
               onFilterChange={handleFilterChange}
               simplePriceLimit={simplePriceLimit}
               onSimplePriceChange={setSimplePriceLimit}
               isFilterOpen={isFilterOpen}
               toggleFilter={() => setIsFilterOpen(!isFilterOpen)}
               setActiveDomain={setActiveDomain}
               domains={DOMAINS}
            />

            {isLoading ? (
               <div className="flex justify-center py-20">
                  <Loader2 size={40} className="animate-spin text-teal-600" />
               </div>
            ) : (
               <div className="max-w-7xl mx-auto">
                  {filteredListings.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredListings.map(item => (
                           <ListingCard
                              key={item.id}
                              listing={item}
                              onClick={() => setSelectedListing(item)}
                           />
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                        <div className="inline-flex p-4 rounded-full bg-white shadow-sm text-slate-300 mb-4">
                           <Compass size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{t('no_items')}</h3>
                        <p className="text-slate-500 max-w-md mx-auto">{t('try_adjusting')}</p>
                        <button
                           onClick={() => {
                              setFilters({
                                 type: 'all', category: 'all', location: 'All', propertyCategory: 'All',
                                 bedrooms: 'Any', minPrice: '', maxPrice: '', brand: 'all', year: 'all',
                                 transmission: 'all', fuel: 'all', body: 'all'
                              });
                              setSimplePriceLimit(1000000);
                           }}
                           className="mt-4 text-teal-600 font-bold text-sm hover:underline"
                        >
                           {t('clear_filters')}
                        </button>
                     </div>
                  )}
               </div>
            )}

            {selectedListing && (
               selectedListing.domain === 'Marketplace' ? (
                  <ProductDetailModal
                     item={selectedListing}
                     onClose={() => setSelectedListing(null)}
                  />
               ) : (
                  <BookingModal
                     listing={selectedListing as Listing}
                     onClose={() => setSelectedListing(null)}
                  />
               )
            )}
         </div>
      </section>
   );
};

export default Explore;
