
import React from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EXPERIENCES = [
  {
    id: 1,
    title: "Sunset Yachting",
    location: "Kyrenia Old Harbour",
    price: "From £450",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?q=80&w=2670&auto=format&fit=crop",
    size: "col-span-1 md:col-span-2 row-span-2"
  },
  {
    id: 2,
    title: "Vineyard Tasting",
    location: "Gillham Estate",
    price: "From £60",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1516594915697-87b5d4e07d34?q=80&w=2669&auto=format&fit=crop",
    size: "col-span-1 md:col-span-1 row-span-1"
  },
  {
    id: 3,
    title: "Ancient Abbey Tour",
    location: "Bellapais",
    price: "From £35",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1590665510909-c30f14541919?q=80&w=2670&auto=format&fit=crop",
    size: "col-span-1 md:col-span-1 row-span-1"
  }
];

interface LifestyleHighlightsProps {
  onSeeAll?: () => void;
}

const LifestyleHighlights: React.FC<LifestyleHighlightsProps> = ({ onSeeAll }) => {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div className="max-w-2xl">
            <span className="text-teal-600 font-bold tracking-wider uppercase text-xs mb-2 block">Curated Experiences</span>
            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
              Don't just visit. <br/> <span className="text-slate-400 font-serif italic">Live the island life.</span>
            </h2>
          </div>
          <button
            onClick={() => (onSeeAll ? onSeeAll() : navigate('/discover'))}
            className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors"
          >
            View All Experiences <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 h-[600px]">
          {EXPERIENCES.map((item) => (
            <div 
              key={item.id} 
              className={`relative group overflow-hidden rounded-3xl cursor-pointer ${item.size}`}
            >
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
              
              <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                      <Star size={12} className="fill-yellow-400"/> {item.rating}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-slate-300 text-sm">{item.location}</p>
                  </div>
                  <div className="text-right">
                     <div className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold border border-white/30 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                        {item.price}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <button
            onClick={() => (onSeeAll ? onSeeAll() : navigate('/discover'))}
            className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold w-full"
          >
            Explore Experiences
          </button>
        </div>
      </div>
    </section>
  );
};

export default LifestyleHighlights;
