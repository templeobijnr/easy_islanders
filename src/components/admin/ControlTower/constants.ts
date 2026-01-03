/**
 * ControlTower - Constants
 */
import { LayoutDashboard, Users, Calendar, Package, Compass, Rocket, Bot, DollarSign, Brain, Shield, Settings } from "lucide-react";
import type { DeckConfig } from "./types";

export const DECKS: DeckConfig[] = [
    { id: "mission", label: "Mission Control", icon: Rocket },
    { id: "catalog", label: "Catalog Manager", icon: Package },
    { id: "connect", label: "Connect Manager", icon: Users },
    { id: "discover", label: "Discover Control", icon: Compass },
    { id: "bookings", label: "Booking Requests", icon: Calendar },
    { id: "merve", label: "Merve AI", icon: Bot },
    { id: "admin", label: "Admin Management", icon: LayoutDashboard },
    // Placeholder items (greyed out - coming soon)
    { id: "financials", label: "Financials", icon: DollarSign, disabled: true, comingSoon: true },
    { id: "algorithm", label: "Algorithm Tuner", icon: Brain, disabled: true, comingSoon: true },
    { id: "moderation", label: "Content Moderation", icon: Shield, disabled: true, comingSoon: true },
    { id: "sysconfig", label: "System Config", icon: Settings, disabled: true, comingSoon: true },
];
