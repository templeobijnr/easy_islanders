
import React from 'react';
import { SlidersHorizontal, MapPin, Building2, BedDouble, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const DISTRICTS = ['All', 'Kyrenia', 'Nicosia', 'Famagusta', 'Iskele', 'Lefke', 'Guzelyurt'];
const PROPERTY_TYPES = ['All', 'Villa', 'Apartment', 'Penthouse', 'Bungalow', 'Townhouse', 'Land', 'Commercial'];
const SERVICE_CATEGORIES = ['All', 'Home Maintenance', 'Construction & Renovation', 'Outdoors', 'Cleaning Services', 'Care Services', 'Events & Lifestyle', 'Vehicle Services', 'Professional'];

interface FilterBarProps {
  activeDomain: string;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  simplePriceLimit: number;
  onSimplePriceChange: (val: number) => void;
  isFilterOpen: boolean;
  toggleFilter: () => void;
  setActiveDomain: (domain: string) => void;
  domains: { id: string; label: string; icon: any }[];
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  activeDomain, filters, onFilterChange, simplePriceLimit, onSimplePriceChange, 
  isFilterOpen, toggleFilter, setActiveDomain, domains 
}) => {
  
  const { t } = useLanguage();

  const renderDynamicFilters = () => {
    if (activeDomain === 'Real Estate') {
      return (
         <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
            {['all', 'short-term', 'long-term', 'sale', 'project'].map(opt => (
               <button key={opt} onClick={() => onFilterChange('type', opt)} 
                  className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${filters.type === opt ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {opt.replace('-', ' ')}
               </button>
            ))}
         </div>
      );
    }
    if (activeDomain === 'Cars') {
        return (
           <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
              {['all', 'rental', 'sale'].map(opt => (
                 <button key={opt} onClick={() => onFilterChange('type', opt)} 
                    className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.type === opt ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                    {opt === 'all' ? 'All Types' : opt}
                 </button>
              ))}
           </div>
        );
     }
     if (activeDomain === 'Services') {
        return (
           <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
              {SERVICE_CATEGORIES.map(cat => (
                 <button key={cat} onClick={() => onFilterChange('category', cat)} 
                    className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap ${filters.category === cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                    {cat}
                 </button>
              ))}
           </div>
        );
     }
    return null;
  };

  return (
    <div className="sticky top-20 z-30 mx-auto max-w-7xl mb-12">
       <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 rounded-2xl p-4 transition-all ring-1 ring-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Domains */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide pb-2 md:pb-0 px-1">
                {domains.map(dom => {
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
                    onClick={toggleFilter}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
                      isFilterOpen 
                        ? 'bg-teal-50 text-teal-700 ring-2 ring-teal-100 shadow-inner' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <SlidersHorizontal size={16} />
                    {activeDomain === 'Real Estate' ? t('advanced_search') : t('filters')}
                </button>
              </div>
          </div>

          <div className="mt-4">
            {renderDynamicFilters()}
          </div>
          
          {/* DRAWER */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterOpen ? 'max-h-[500px] opacity-100 mt-4 pb-2' : 'max-h-0 opacity-0'}`}>
              <div className="pt-6 border-t border-slate-100 px-2">
                  
                  {activeDomain === 'Real Estate' ? (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MapPin size={12}/> {t('district')}</label>
                           <select 
                              value={filters.location} 
                              onChange={(e) => onFilterChange('location', e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                           >
                              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Building2 size={12}/> {t('property_type')}</label>
                           <select 
                              value={filters.propertyCategory} 
                              onChange={(e) => onFilterChange('propertyCategory', e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                           >
                              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                           </select>
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><BedDouble size={12}/> {t('bedrooms')}</label>
                           <div className="flex gap-1">
                              {['Any', 'Studio', '1', '2', '3', '4', '5+'].map(b => (
                                 <button 
                                   key={b}
                                   onClick={() => onFilterChange('bedrooms', b)}
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

                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">{t('price_range')} (GBP)</label>
                           <div className="flex gap-2">
                              <input 
                                 type="number" 
                                 placeholder="Min" 
                                 value={filters.minPrice}
                                 onChange={(e) => onFilterChange('minPrice', e.target.value)}
                                 className="w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <input 
                                 type="number" 
                                 placeholder="Max" 
                                 value={filters.maxPrice}
                                 onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                                 className="w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                              />
                           </div>
                        </div>

                        <div className="md:col-span-4 flex justify-end pt-2">
                           <button 
                             onClick={toggleFilter} 
                             className="bg-teal-600 text-white px-8 py-2 rounded-full font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
                           >
                              <Search size={16} /> {t('show_results')}
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-6">
                       <div className="flex justify-between items-center">
                           <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                             {t('max_price')}
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
                           onChange={(e) => onSimplePriceChange(parseInt(e.target.value))}
                           className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 hover:accent-teal-600 transition-colors"
                       />
                     </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};

export default FilterBar;
