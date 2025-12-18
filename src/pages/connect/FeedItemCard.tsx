import { logger } from "@/utils/logger";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Clock,
  Heart,
  PartyPopper,
  Music,
  Utensils,
  Dumbbell,
  Briefcase,
} from "lucide-react";
import { FeedItem } from "../../types/connect";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { formatDate } from "../../utils/formatters";

interface FeedItemCardProps {
  item: FeedItem & {
    participantCount?: number;
    goingCount?: number;
    eventCategory?: string;
    locationName?: string;
  };
  onJoin?: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  party: PartyPopper,
  music: Music,
  food: Utensils,
  fitness: Dumbbell,
  business: Briefcase,
  community: Users,
  wellness: Heart,
  other: Calendar,
};

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item, onJoin }) => {
  const [goingCount, setGoingCount] = useState(
    item.goingCount || item.participantCount || 0,
  );
  const isEvent = item.type === "event";
  const image =
    item.images?.[0] || "https://source.unsplash.com/random/800x600/?island";

  // Real-time going count listener
  useEffect(() => {
    const q = query(
      collection(db, "eventAttendees"),
      where("eventId", "==", item.id),
      where("status", "==", "going"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGoingCount(snapshot.docs.length);
      },
      (error) => {
        // Fallback to static count if query fails (missing index)
        logger.debug("Using static count for", item.id);
      },
    );

    return () => unsubscribe();
  }, [item.id]);

  // Format date if available
  const startTime = (item as any).startTime || (item as any).eventDate;
  const dateStr = startTime
    ? formatDate(startTime, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const CategoryIcon =
    CATEGORY_ICONS[(item as any).eventCategory || "other"] || Calendar;

  return (
    <div
      className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full transform hover:-translate-y-1 cursor-pointer"
      onClick={() => onJoin?.(item.id)}
    >
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={item.title}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-sm flex items-center gap-1">
            <CategoryIcon size={12} />
            {(item as any).eventCategory ||
              item.type?.replace("_", " ") ||
              "Activity"}
          </div>
        </div>

        {/* Going Count Badge */}
        {goingCount > 0 && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
            <Users size={12} />
            {goingCount} going
          </div>
        )}

        {/* Price Tag (if applicable) */}
        {(item as any).price ? (
          <div className="absolute bottom-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {(item as any).currency} {(item as any).price}
          </div>
        ) : (
          <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
            Free
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4 flex-1">
          <h3 className="font-bold text-slate-900 text-xl leading-tight mb-2 group-hover:text-cyan-600 transition-colors">
            {item.title}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-2.5 mb-6">
          {dateStr && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Calendar size={14} />
              </div>
              <span className="font-medium">{dateStr}</span>
            </div>
          )}
          {((item as any).locationName ||
            (item as any).address ||
            (item as any).region) && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <MapPin size={14} />
              </div>
              <span className="font-medium line-clamp-1">
                {(item as any).locationName ||
                  (item as any).address ||
                  (item as any).region}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin?.(item.id);
          }}
          className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm transition-all hover:bg-slate-800 hover:shadow-lg hover:ring-2 hover:ring-slate-900/10 flex items-center justify-center gap-2 group/btn"
        >
          {isEvent ? "View Event" : "View Activity"}
          <ArrowRight
            size={16}
            className="transition-transform group-hover/btn:translate-x-1"
          />
        </button>
      </div>
    </div>
  );
};

export default FeedItemCard;
