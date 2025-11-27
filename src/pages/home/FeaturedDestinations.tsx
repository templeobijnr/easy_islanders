
import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

const DESTINATIONS = [
  {
    id: 1,
    name: "Kyrenia Harbour",
    desc: "The Jewel of the Mediterranean",
    properties: 124,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?q=80&w=2574&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "Golden Beach",
    desc: "Untouched sands of Karpaz",
    properties: 18,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2673&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "Bellapais Village",
    desc: "Historic mountain tranquility",
    properties: 45,
    image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?q=80&w=2670&auto=format&fit=crop"
  },
  {
    id: 4,
    name: "Famagusta Walled City",
    desc: "History meets modern life",
    properties: 86,
    image: "https://images.unsplash.com/photo-1572377605158-12f32358e459?q=80&w=2670&auto=format&fit=crop"
  }
];

const FeaturedDestinations: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
           <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Explore by Region</h2>
           <p className="text-slate-500">From the bustling harbours to the quiet mountain peaks, find the perfect backdrop for your story.</p>
        </div>

        <div className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory scrollbar-hide">
           {DESTINATIONS.map((dest) => (
              <div 
                key={dest.id} 
                className="snap-center min-w-[280px] md:min-w-[350px] h-[450px] relative rounded-3xl overflow-hidden group cursor-pointer"
              >
                 <img 
                   src={dest.image} 
                   alt={dest.name} 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/90"></div>
                 
                 <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider mb-2">
                       <MapPin size={12} /> {dest.properties} Listings
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">{dest.name}</h3>
                    <p className="text-slate-300 text-sm mb-4">{dest.desc}</p>
                    
                    <div className="flex items-center gap-2 text-teal-400 text-sm font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                       Discover <ArrowRight size={16} />
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;
