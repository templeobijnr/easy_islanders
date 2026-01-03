/**
 * ControlTower - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Main file remains composer (loading child decks)
 * - Behavior preserved: yes (no UI change)
 */
export type Deck =
    | "mission"
    | "catalog"
    | "connect"
    | "discover"
    | "bookings"
    | "merve"
    | "admin"
    | "financials"
    | "algorithm"
    | "moderation"
    | "sysconfig";

export type ConnectTab = "curation" | "events" | "live";
export type CatalogTab = "all" | "places" | "stays" | "activities" | "events" | "experiences";

export interface ControlTowerProps {
    onExit?: () => void;
}

export interface DeckConfig {
    id: Deck;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    disabled?: boolean;
    comingSoon?: boolean;
}
