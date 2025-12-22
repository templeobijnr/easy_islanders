/**
 * CurationDeck - Constants
 */
import { Flame, Calendar, CalendarDays, Star, Users } from "lucide-react";
import type { SectionConfig } from "./types";

export const SECTIONS: SectionConfig[] = [
    { id: "live", label: "Live Pulse", icon: Users, color: "green" },
    { id: "trending", label: "Trending Now", icon: Flame, color: "red" },
    { id: "today", label: "Happening Today", icon: Calendar, color: "orange" },
    { id: "week", label: "This Week", icon: CalendarDays, color: "blue" },
    { id: "featured", label: "Featured", icon: Star, color: "yellow" },
];

export const RANDOM_NAMES = [
    "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
    "Avery", "Parker", "Cameron", "Dakota", "Reese", "Finley", "Hayden", "Jamie",
];
