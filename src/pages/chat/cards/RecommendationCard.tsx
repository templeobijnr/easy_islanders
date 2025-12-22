
import React from 'react';
import { MapPin } from 'lucide-react';
import { UnifiedItem } from '../../../types';
import { formatMoney } from '../../../utils/formatters';

interface RecommendationCardProps {
  item: UnifiedItem;
  onClick: (item: UnifiedItem) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ item, onClick }) => {
  const getDomainColor = () => {
    switch (item.domain) {
      case 'Cars': return 'bg-blue-600';
      case 'Restaurants': return 'bg-orange-500';
      case 'Services': return 'bg-purple-600';
      case 'Health & Beauty': return 'bg-rose-500';
      default: return 'bg-teal-600';
    }
  };

  const priceLabel = formatMoney((item as any)?.price, '£');
  const imageUrl =
    (item as any)?.imageUrl ||
    (Array.isArray((item as any)?.images) ? (item as any).images[0] : undefined) ||
    'https://source.unsplash.com/random/800x600/?island';

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => onClick(item)}>
      <div className="h-32 overflow-hidden relative">
        <img src={imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">
          {priceLabel === '—' ? 'N/A' : priceLabel}
        </div>
        <div className={`absolute top-2 left-2 ${getDomainColor()} text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase`}>
          {item.domain}
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 mb-2">
          <MapPin size={10} />
          {item.location}
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
