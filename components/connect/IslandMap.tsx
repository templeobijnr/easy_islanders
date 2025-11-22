
import React, { useState } from 'react';
import { MapPin, Music, Users, Star, Calendar, X, ChevronRight, Zap } from 'lucide-react';
import { SocialUser, HotZone, EventItem } from '../../types';
import { MOCK_SOCIAL_USERS, MOCK_HOT_ZONES, MOCK_EVENTS } from '../../constants';

// Coordinate mapping for North Cyprus locations (approximate % on the map container)
const LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  'Kyrenia': { x: 42, y: 15 },
  'Kyrenia Harbour': { x: 43, y: 14 },
  'Bellapais': { x: 46, y: 18 },
  'Alsancak': { x: 35, y: 16 },
  'Lapta': { x: 28, y: 17 },
  'Nicosia': { x: 45, y: 45 },
  'Famagusta': { x: 75, y: 50 },
  'Iskele': { x: 70, y: 35 },
  'Bogaz': { x: 72, y: 30 },
  'Karpaz': { x: 90, y: 15 },
  'Lefke': { x: 15, y: 40 },
  'Catalkoy': { x: 50, y: 16 },
};

// Helper to get coords with slight randomization to prevent stacking
const getCoords = (locationName: string) => {
  // Default to center if unknown
  const base = Object.keys(LOCATION_COORDS).find(k => locationName.includes(k)) 
    ? LOCATION_COORDS[Object.keys(LOCATION_COORDS).find(k => locationName.includes(k)) as string]
    : { x: 50, y: 50 };

  return {
    x: base.x + (Math.random() * 4 - 2),
    y: base.y + (Math.random() * 4 - 2)
  };
};

interface IslandMapProps {
  currentUser: SocialUser;
}

const IslandMap: React.FC<IslandMapProps> = ({ currentUser }) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'events' | 'people'>('all');

  // Combine data for rendering
  const mapItems = [
    // Hot Zones (Venues)
    ...MOCK_HOT_ZONES.map(z => ({ ...z, type: 'venue', coords: getCoords(z.location) })),
    // Events
    ...MOCK_EVENTS.map(e => ({ ...e, type: 'event', coords: getCoords(e.venue) })),
    // Users (excluding current user)
    ...MOCK_SOCIAL_USERS.filter(u => u.currentLocation).map(u => ({ ...u, type: 'user', coords: getCoords(u.currentLocation!) }))
  ];

  const filteredItems = mapItems.filter(item => {
    if (filter === 'events') return item.type === 'event' || item.type === 'venue';
    if (filter === 'people') return item.type === 'user';
    return true;
  });

  return (
    <div className="relative w-full h-[75vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none group">
      
      {/* --- MAP BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dark Ocean */}
        <div className="absolute inset-0 bg-[#0f172a]"></div>
        
        {/* Stylized Island Shape (Abstracted using gradient masks for demo) */}
        {/* In a real app, this would be a GeoJSON SVG or Mapbox container */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
            {/* Grid Lines */}
            <div className="absolute w-full h-full" style={{ 
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
            }}></div>
        </div>

        {/* Abstract Landmass Glows */}
        <div className="absolute top-[10%] left-[10%] w-[80%] h-[60%] bg-emerald-900/20 blur-[80px] rounded-[100%] transform rotate-12"></div>
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-blue-900/20 blur-[60px] rounded-full"></div>
      </div>

      {/* --- UI OVERLAYS --- */}
      
      {/* Filter Pills */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-xl">
        {['all', 'events', 'people'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Compass / Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
         <button className="w-10 h-10 bg-slate-800/90 backdrop-blur text-white rounded-full flex items-center justify-center shadow-lg border border-slate-700 hover:bg-slate-700 transition-colors">
            <MapPin size={18} />
         </button>
         <div className="w-10 h-10 bg-slate-800/90 backdrop-blur text-teal-400 rounded-full flex items-center justify-center shadow-lg border border-slate-700">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-current"></div>
         </div>
      </div>

      {/* --- MAP ELEMENTS --- */}
      <div className="absolute inset-0">
         {filteredItems.map((item: any, index) => (
            <div
              key={`${item.type}-${item.id}-${index}`}
              className="absolute transition-all duration-500 ease-out hover:z-50 cursor-pointer group/pin"
              style={{ top: `${item.coords.y}%`, left: `${item.coords.x}%` }}
              onClick={() => setSelectedItem(item)}
            >
               {/* 1. USER AVATAR */}
               {item.type === 'user' && (
                  <div className="relative flex flex-col items-center -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
                     <div className="relative">
                        <img 
                          src={item.avatar} 
                          alt={item.name} 
                          className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white object-cover"
                        />
                        {/* Online Status */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                     </div>
                     <div className="mt-1 px-2 py-0.5 bg-slate-900/80 backdrop-blur rounded-md text-[10px] font-bold text-white opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap">
                        {item.name}
                     </div>
                  </div>
               )}

               {/* 2. EVENT PIN */}
               {item.type === 'event' && (
                  <div className="relative -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
                     {/* Pulse Ring */}
                     <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-30"></div>
                     <div className="w-10 h-10 bg-purple-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white relative z-10">
                        <Music size={18} />
                     </div>
                     <div className="absolute -top-2 -right-2 bg-yellow-400 text-slate-900 text-[9px] font-bold px-1.5 rounded-md border border-white shadow-sm rotate-12">
                        {new Date(item.date).getDate()}
                     </div>
                  </div>
               )}

               {/* 3. VENUE / HOTZONE */}
               {item.type === 'venue' && (
                  <div className="relative -translate-x-1/2 -translate-y-1/2 group-hover/pin:scale-110 transition-transform">
                     {item.isTrending && (
                        <div className="absolute -inset-4 bg-red-500/20 rounded-full blur-md animate-pulse"></div>
                     )}
                     <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${item.isTrending ? 'bg-red-500 w-4 h-4' : 'bg-teal-500'}`}></div>
                     {item.isTrending && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1">
                           <Zap size={8} className="fill-red-600"/> Trending
                        </div>
                     )}
                  </div>
               )}
            </div>
         ))}

         {/* Current User "Me" */}
         <div className="absolute top-[15%] left-[42%] -translate-x-1/2 -translate-y-full z-10">
            <div className="flex flex-col items-center">
               <div className="w-12 h-12 rounded-full border-4 border-teal-500 bg-white shadow-xl overflow-hidden relative">
                  <img src={currentUser.avatar} className="w-full h-full object-cover" />
               </div>
               <div className="mt-1 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                  YOU
               </div>
            </div>
         </div>
      </div>

      {/* --- DETAIL POPUP CARD --- */}
      {selectedItem && (
         <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white rounded-2xl shadow-2xl p-4 z-30 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-3">
               <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  selectedItem.type === 'event' ? 'bg-purple-100 text-purple-700' :
                  selectedItem.type === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
               }`}>
                  {selectedItem.type === 'venue' ? 'Hotspot' : selectedItem.type}
               </span>
               <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-700"><X size={16}/></button>
            </div>

            <div className="flex gap-4 mb-4">
               <img 
                  src={selectedItem.type === 'user' ? selectedItem.avatar : selectedItem.imageUrl} 
                  className="w-16 h-16 rounded-xl object-cover bg-slate-100"
                  alt={selectedItem.name || selectedItem.title} 
               />
               <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{selectedItem.name || selectedItem.title}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                     <MapPin size={12} /> {selectedItem.location || selectedItem.currentLocation || selectedItem.venue}
                  </div>
                  {selectedItem.type === 'venue' && (
                     <div className="text-xs text-teal-600 font-bold mt-1 flex items-center gap-1">
                        <Users size={12}/> {selectedItem.activeCount} people here
                     </div>
                  )}
                  {selectedItem.type === 'event' && (
                     <div className="text-xs text-purple-600 font-bold mt-1 flex items-center gap-1">
                        <Calendar size={12}/> {new Date(selectedItem.date).toLocaleDateString()}
                     </div>
                  )}
               </div>
            </div>

            <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
               {selectedItem.type === 'user' ? 'Say Hello' : selectedItem.type === 'event' ? 'Get Tickets' : 'View Details'}
               <ChevronRight size={16} />
            </button>
         </div>
      )}

    </div>
  );
};

export default IslandMap;
