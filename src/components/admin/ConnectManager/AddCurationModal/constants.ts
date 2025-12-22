/**
 * AddCurationModal Constants
 */
import {
    Calendar,
    Music,
    Utensils,
    PartyPopper,
    Dumbbell,
    Briefcase,
    Heart,
    Users,
    UserPlus,
    CreditCard,
    Ticket,
    CalendarDays,
    CheckCircle,
    Share2,
    Link,
} from "lucide-react";
import type { SectionConfig, EventCategory, ActionConfig } from "./types";

export const SECTIONS: SectionConfig[] = [
    { id: "trending", label: "Trending Now" },
    { id: "today", label: "Happening Today" },
    { id: "week", label: "This Week" },
    { id: "featured", label: "Featured" },
];

export const EVENT_CATEGORIES: EventCategory[] = [
    { id: "party", label: "Party / Nightlife", icon: PartyPopper },
    { id: "music", label: "Music / Concert", icon: Music },
    { id: "food", label: "Food & Dining", icon: Utensils },
    { id: "fitness", label: "Fitness / Sports", icon: Dumbbell },
    { id: "business", label: "Business / Networking", icon: Briefcase },
    { id: "community", label: "Community / Social", icon: Users },
    { id: "wellness", label: "Wellness / Health", icon: Heart },
    { id: "other", label: "Other", icon: Calendar },
];

export const ACTIONS_CONFIG: ActionConfig[] = [
    {
        id: "going",
        label: "I'm Going",
        icon: Users,
        color: "green",
        description: "Users can mark themselves as going",
    },
    {
        id: "interested",
        label: "Interested",
        icon: Heart,
        color: "pink",
        description: "Users can show interest",
    },
    {
        id: "invite",
        label: "Invite Friends",
        icon: UserPlus,
        color: "purple",
        description: "Users can invite friends",
    },
    { id: "book", label: "Waitlist/Book", icon: CreditCard, color: "emerald" },
    { id: "tickets", label: "Tickets", icon: Ticket, color: "amber" },
    { id: "reserve", label: "Reservations", icon: CalendarDays, color: "blue" },
    { id: "rsvp", label: "RSVP", icon: CheckCircle, color: "indigo" },
    { id: "share", label: "Share Event", icon: Share2, color: "cyan" },
    { id: "link", label: "External Link", icon: Link, color: "slate" },
];

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
