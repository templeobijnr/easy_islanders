/**
 * EventDetailModal Constants
 */
import {
    PartyPopper,
    Music,
    Utensils,
    Dumbbell,
    Briefcase,
    Users,
    Heart,
    Calendar,
} from "lucide-react";
import React from "react";

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
    party: PartyPopper,
    music: Music,
    food: Utensils,
    fitness: Dumbbell,
    business: Briefcase,
    community: Users,
    wellness: Heart,
    other: Calendar,
};
