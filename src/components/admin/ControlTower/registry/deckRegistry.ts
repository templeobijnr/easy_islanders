/**
 * Deck Registry - Declarative configuration for all ControlTower decks
 * 
 * GUARDRAILS:
 * ✅ Contains: component reference, label, icon, flags
 * ✅ Exports types and validation
 * ❌ NO logic, NO hooks, NO JSX, NO side effects
 */
import React from "react";
import {
    Rocket, Package, Users, Compass, Calendar, Bot,
    LayoutDashboard, DollarSign, Brain, Shield, Settings
} from "lucide-react";

import type { Deck, DeckConfig } from "../types";
import { DEFAULT_DECK } from "../constants/uiConstants";
import { ComingSoonPlaceholder } from "../components/ComingSoonPlaceholder";

// Lazy load deck components for code splitting
const MissionControlDashboard = React.lazy(() => import("../../MissionControl/Dashboard"));
const CatalogDeck = React.lazy(() => import("../../CatalogManager/CatalogDeck"));
const CurationDeck = React.lazy(() => import("../../ConnectManager/CurationDeck/CurationDeck"));
const BookingsDeck = React.lazy(() => import("../../BookingsDeck"));
const DiscoverControlDeck = React.lazy(() => import("../../DiscoverManager/DiscoverControlDeck"));
const MerveController = React.lazy(() => import("../../../../pages/admin/MerveController"));
const AdminManagement = React.lazy(() => import("../../AdminManagement"));

/**
 * Deck Registry Entry - defines a deck's component and metadata
 */
export interface DeckRegistryEntry {
    component: React.ComponentType<{}>;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    disabled?: boolean;
    comingSoon?: boolean;
}

/**
 * DECK_REGISTRY - Single source of truth for all deck configurations
 * 
 * Adding a new deck only requires adding an entry here.
 */
export const DECK_REGISTRY: Record<Deck, DeckRegistryEntry> = {
    mission: {
        component: MissionControlDashboard,
        label: "Mission Control",
        icon: Rocket,
    },
    catalog: {
        component: CatalogDeck,
        label: "Catalog Manager",
        icon: Package,
    },
    connect: {
        component: CurationDeck,
        label: "Connect Manager",
        icon: Users,
    },
    discover: {
        component: DiscoverControlDeck,
        label: "Discover Control",
        icon: Compass,
    },
    bookings: {
        component: BookingsDeck,
        label: "Booking Requests",
        icon: Calendar,
    },
    merve: {
        component: MerveController,
        label: "Merve AI",
        icon: Bot,
    },
    admin: {
        component: AdminManagement,
        label: "Admin Management",
        icon: LayoutDashboard,
    },
    // Placeholder decks (coming soon)
    financials: {
        component: ComingSoonPlaceholder,
        label: "Financials",
        icon: DollarSign,
        disabled: true,
        comingSoon: true,
    },
    algorithm: {
        component: ComingSoonPlaceholder,
        label: "Algorithm Tuner",
        icon: Brain,
        disabled: true,
        comingSoon: true,
    },
    moderation: {
        component: ComingSoonPlaceholder,
        label: "Content Moderation",
        icon: Shield,
        disabled: true,
        comingSoon: true,
    },
    sysconfig: {
        component: ComingSoonPlaceholder,
        label: "System Config",
        icon: Settings,
        disabled: true,
        comingSoon: true,
    },
};

/**
 * Get deck component by ID
 * Returns component reference, NOT JSX
 */
export function getDeckComponent(deckId: Deck): React.ComponentType<{}> {
    const entry = DECK_REGISTRY[deckId];
    if (!entry) {
        console.error(`[ControlTower] Unknown deck: ${deckId}`);
        return DECK_REGISTRY[DEFAULT_DECK].component;
    }
    return entry.component;
}

/**
 * Get all deck IDs in order
 */
export function getDeckIds(): Deck[] {
    return Object.keys(DECK_REGISTRY) as Deck[];
}

/**
 * Validate registry completeness (development only)
 * Logs warnings if expected decks are missing
 */
export function validateRegistryCompleteness(): void {
    const allDeckIds = Object.keys(DECK_REGISTRY) as Deck[];
    const expectedDeckIds: Deck[] = [
        "mission", "catalog", "connect", "discover", "bookings",
        "merve", "admin", "financials", "algorithm", "moderation", "sysconfig"
    ];

    const missing = expectedDeckIds.filter(id => !allDeckIds.includes(id));
    if (missing.length > 0) {
        console.error(`[ControlTower] Missing registry entries: ${missing.join(", ")}`);
    }

    const extra = allDeckIds.filter(id => !expectedDeckIds.includes(id));
    if (extra.length > 0) {
        console.warn(`[ControlTower] Unexpected registry entries: ${extra.join(", ")}`);
    }

    if (missing.length === 0 && extra.length === 0) {
        console.log("[ControlTower] Registry validation passed ✓");
    }
}
