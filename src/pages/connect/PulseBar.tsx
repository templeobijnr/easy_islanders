
import React from 'react';
import { MapPin, Zap, Music, Coffee, Umbrella } from 'lucide-react';
import { HotZone } from '../../types';

interface PulseBarProps {
  hotZones: HotZone[];
  onDropAnchor: (zone: HotZone) => void;
  currentZoneId?: string;
}

const PulseBar: React.FC<PulseBarProps> = ({ hotZones, onDropAnchor, currentZoneId }) => {
  
  const getIcon = (category: string) => {
    switch(category) {
      case 'Nightlife': return <Music size={14} />;
      case 'Cafe': return <Coffee size={14} />;
      case 'Beach': return <Umbrella size={14} />;
      default: return <MapPin size={14} />;
    }
  };

  return (
    <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
       <div className="flex gap-4 w-max">
          {hotZones.map(zone => {
             const isActive = currentZoneId === zone.id;
             return (
                <div 
                  key={zone.id}
                  onClick={() => onDropAnchor(zone)}
                  className={`relative min-w-[160px] h-24 rounded-2xl overflow-hidden cursor-pointer transition-all group ${isActive ? 'ring-4 ring-teal-500 ring-offset-2' : 'hover:scale-105'}`}
                >
                   <img src={zone.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={zone.name} />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                   
                   {/* Live Indicator */}
                   <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/20">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-white">{zone.activeCount}</span>
                   </div>

                   {/* Content */}
                   <div className="absolute bottom-0 left-0 p-3 w-full">
                      <div className="flex items-center gap-1 text-teal-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                         {getIcon(zone.category)} {zone.category}
                      </div>
                      <div className="font-bold text-white text-sm truncate">{zone.name}</div>
                      {isActive && (
                         <div className="flex items-center gap-1 text-[10px] text-teal-400 font-bold mt-1">
                            <Zap size={10} className="fill-teal-400"/> Anchored Here
                         </div>
                      )}
                   </div>
                </div>
             );
          })}
       </div>
    </div>
  );
};

export default PulseBar;
