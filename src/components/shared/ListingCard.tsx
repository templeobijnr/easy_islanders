
import React from 'react';
import { Star, Heart, Calendar, Car } from 'lucide-react';
import { Listing, UnifiedItem, HotelItem, Vehicle, RestaurantItem, EventItem, Service } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface ListingCardProps {
  listing: Listing | UnifiedItem;
  onClick?: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick }) => {
  const isRental = listing.domain === 'Real Estate' && (listing.rentalType === 'short-term' || listing.rentalType === 'long-term');
  const isHotel = listing.domain === 'Hotels';

  const priceLabel = formatMoney((listing as any)?.price, '£');
  const tags = Array.isArray((listing as any)?.tags) ? (listing as any).tags : [];
  const imageUrl =
    (listing as any)?.imageUrl ||
    (Array.isArray((listing as any)?.images) ? (listing as any).images[0] : undefined) ||
    'https://source.unsplash.com/random/800x600/?island';

  // --- HELPER: Get Label & Sub-info ---
  const getMetaInfo = () => {
    if (listing.domain === 'Real Estate') {
      const l = listing as Listing;
      if (l.rentalType === 'short-term') return { label: '/ night', badge: 'Short Term', color: 'bg-teal-600' };
      if (l.rentalType === 'long-term') return { label: '/ month', badge: 'Long Term', color: 'bg-blue-600' };
      if (l.rentalType === 'sale') return { label: '', badge: 'For Sale', color: 'bg-emerald-600' };
      return { label: 'start price', badge: 'Project', color: 'bg-purple-600' };
    }
    if (listing.domain === 'Hotels') {
      const h = listing as HotelItem;
      return { label: '/ night', badge: h.hotelType, color: 'bg-indigo-600' };
    }
    if (listing.domain === 'Cars') {
      const v = listing as Vehicle;
      return { label: v.type === 'rental' ? '/ day' : '', badge: v.type === 'rental' ? 'Rental' : 'Sale', color: 'bg-blue-500' };
    }
    if (listing.domain === 'Restaurants') {
      const r = listing as RestaurantItem;
      return { label: 'approx.', badge: r.category, color: 'bg-orange-500' };
    }
    if (listing.domain === 'Services') {
      const s = listing as Service;
      return { label: 'est.', badge: s.category, color: 'bg-slate-600' };
    }
    if (listing.domain === 'Events') {
      const e = listing as EventItem;
      return { label: '/ ticket', badge: e.eventType, color: 'bg-pink-500' };
    }
    return { label: '', badge: listing.domain, color: 'bg-slate-900' };
  };

  const meta = getMetaInfo();

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-3 right-3 z-10">
          <button
            className="p-2 rounded-full bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white transition-colors"
            onClick={(e) => { e.stopPropagation(); /* Add save logic here */ }}
          >
            <Heart size={18} />
          </button>
        </div>
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span className={`px-3 py-1 ${meta.color}/90 backdrop-blur-md text-xs font-bold text-white rounded-full uppercase tracking-wider w-fit shadow-sm`}>
            {meta.badge}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{listing.title}</h3>
          {(isRental || isHotel || listing.rating) && (
            <div className="flex items-center gap-1 text-slate-800 font-medium text-sm">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              {listing.rating || (isHotel ? (listing as HotelItem).stars : 4.8)}
            </div>
          )}
        </div>

        <p className="text-slate-500 text-sm mb-4 flex items-center gap-1">
          {listing.location}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 2).map((tag: string) => (
            <span key={tag} className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded-md">
              {tag}
            </span>
          ))}
        </div>

        {/* Domain Specific Data */}
        {listing.domain === 'Real Estate' && (listing as Listing).rentalType === 'project' && (
          <div className="mb-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg flex items-center gap-2">
            <Calendar size={12} /> Completion: {(listing as Listing).completionDate}
          </div>
        )}
        {listing.domain === 'Cars' && (
          <div className="mb-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg flex items-center gap-2">
            <Car size={12} /> {(listing as Vehicle).transmission} · {(listing as Vehicle).fuelType}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
          <div>
            <span className="text-xl font-bold text-slate-900">{priceLabel === '—' ? 'Price on request' : priceLabel}</span>
            <span className="text-slate-500 text-sm"> {meta.label}</span>
          </div>
          <button className="text-sm font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-4">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
