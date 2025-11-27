
import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

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

const CollectionBanner: React.FC = () => {
  const [currentCollection, setCurrentCollection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCollection((prev) => (prev + 1) % COLLECTIONS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const collection = COLLECTIONS[currentCollection];

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-16 shadow-2xl group mx-auto max-w-7xl">
      {COLLECTIONS.map((c, index) => (
         <div 
           key={c.id}
           className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentCollection ? 'opacity-100' : 'opacity-0'}`}
         >
           <img 
             src={c.image} 
             alt={c.title} 
             className="w-full h-full object-cover transition-transform duration-[10000ms] scale-105 group-hover:scale-110"
           />
           <div className={`absolute inset-0 bg-gradient-to-t ${c.color} via-black/20 to-transparent opacity-90`}></div>
         </div>
      ))}

      <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3 lg:w-1/2 z-10">
         <div className="overflow-hidden">
            <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-white/90 border border-white/20 rounded-full backdrop-blur-md uppercase shadow-sm">
              Featured Collection
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-xl">
              {collection.title}
            </h2>
            <p className="text-lg text-white/90 mb-8 font-light leading-relaxed drop-shadow-md max-w-md">
              {collection.subtitle}
            </p>
            <button className="px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-teal-50 transition-all flex items-center gap-2 group/btn shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              View Collection <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default CollectionBanner;
