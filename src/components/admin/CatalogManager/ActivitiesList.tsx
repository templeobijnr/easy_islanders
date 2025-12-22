import React, { useEffect, useState } from 'react';
import { ActivitiesService } from '../../../services/domains/activities/activities.service';
import { FirestoreActivity } from '../../../types/catalog';
import { Edit3, MapPin, Activity as ActivityIcon, RefreshCw } from 'lucide-react';

interface ActivitiesListProps {
  onEdit: (activity: FirestoreActivity) => void;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({ onEdit }) => {
  const [activities, setActivities] = useState<FirestoreActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await ActivitiesService.getActivities();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <ActivityIcon size={16} className="text-cyan-400" />
            Existing Activities
          </h3>
          <p className="text-xs text-slate-500">Click an activity to load it into the editor.</p>
        </div>
        <button
          onClick={loadActivities}
          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {activities.length === 0 && !loading && (
        <p className="text-xs text-slate-500">No activities created yet.</p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => onEdit(activity)}
            className="w-full text-left px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 truncate max-w-[200px]">
                  {activity.title || 'Untitled Activity'}
                </span>
                {activity.region && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    <MapPin size={10} className="text-cyan-400" />
                    {activity.region}
                  </span>
                )}
              </div>
              <span className="text-slate-500">
                {activity.price
                  ? `${activity.currency || 'GBP'} ${activity.price}`
                  : 'Price TBD'}
              </span>
            </div>
            <Edit3 size={14} className="text-cyan-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActivitiesList;

