/**
 * ControlTower - Constants
 */
import { LayoutDashboard, MapPin, Users, Sliders, Calendar, Package, Compass } from "lucide-react";
import type { DeckConfig } from "./types";

export const DECKS: DeckConfig[] = [
    { id: "catalog", label: "Catalog", icon: Package },
    { id: "connect", label: "Connect", icon: Users },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "settings", label: "Settings", icon: Sliders },
    { id: "admin", label: "Admin", icon: LayoutDashboard },
];
