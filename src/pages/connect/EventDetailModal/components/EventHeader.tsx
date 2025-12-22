/**
 * EventHeader - Hero header with image and stats
 */
import React from "react";
import { Users, Heart, Calendar } from "lucide-react";
import { CATEGORY_ICONS } from "../constants";
import type { EventDetailModalProps } from "../types";

interface EventHeaderProps {
    item: EventDetailModalProps["item"];
    isLive: boolean;
    formattedDate: string;
    timeRange: string;
    goingCount: number;
    interestedCount: number;
}

const EventHeader: React.FC<EventHeaderProps> = ({
    item,
    isLive,
    formattedDate,
    timeRange,
    goingCount,
    interestedCount,
}) => {
    const image = item.images?.[0] || "https://source.unsplash.com/random/800x600/?event";
    const CategoryIcon = CATEGORY_ICONS[(item as any).eventCategory || "other"] || Calendar;

    return (
        <div className="relative h-64 sm:h-80 shrink-0">
            <img src={image} className="w-full h-full object-cover" alt={item.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                        <CategoryIcon size={12} />
                        {(item as any).eventCategory || item.type?.replace("_", " ") || "Event"}
                    </span>
                    {isLive && (
                        <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full" /> LIVE NOW
                        </span>
                    )}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">{item.title}</h2>

                <div className="flex items-center gap-4 text-white/90 text-sm">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-cyan-400" />
                        <span className="font-bold">{goingCount}</span> going
                    </div>
                    <div className="flex items-center gap-2">
                        <Heart size={16} className="text-pink-400" />
                        <span className="font-bold">{interestedCount}</span> interested
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventHeader;
