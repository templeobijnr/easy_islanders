import React, { useEffect, useState } from 'react';
import { ListingsService } from '../../../services/domains/stays/stays.service';
import { FirestoreStay } from '../../../types/catalog';
import { Edit3, MapPin, Home, RefreshCw } from 'lucide-react';

interface StaysListProps {
  onEdit: (stay: FirestoreStay) => void;
}

const StaysList: React.FC<StaysListProps> = ({ onEdit }) => {
  const [stays, setStays] = useState<FirestoreStay[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStays = async () => {
    setLoading(true);
    try {
      const data = await ListingsService.getListings();
      setStays(data);
    } catch (err) {
      console.error('Failed to load stays', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStays();
  }, []);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Home size={16} className="text-cyan-400" />
            Existing Stays
          </h3>
          <p className="text-xs text-slate-500">Click a stay to load it into the editor.</p>
        </div>
        <button
          onClick={loadStays}
          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {stays.length === 0 && !loading && (
        <p className="text-xs text-slate-500">No stays created yet.</p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {stays.map((stay) => (
          <button
            key={stay.id}
            onClick={() => onEdit(stay)}
            className="w-full text-left px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 truncate max-w-[200px]">
                  {stay.title || 'Untitled Stay'}
                </span>
                {stay.region && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    <MapPin size={10} className="text-cyan-400" />
                    {stay.region}
                  </span>
                )}
              </div>
              <span className="text-slate-500">
                {stay.price ? `${stay.currency || 'GBP'} ${stay.price} / ${stay.billingPeriod || 'night'}` : 'Price TBD'}
              </span>
            </div>
            <Edit3 size={14} className="text-cyan-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default StaysList;

