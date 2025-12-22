/**
 * CurationDeck - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Extracted hooks: useCurationDeck.ts
 * - Extracted components: CurationSection, CurationItemCard
 * - Behavior preserved: yes (no UI change)
 */
export interface CuratedItem {
    id: string;
    section: "trending" | "today" | "week" | "featured" | "live";
    itemId: string;
    itemType: string;
    itemTitle: string;
    itemImage?: string;
    eventTitle?: string;
    eventDescription?: string;
    actions?: { book?: boolean; reserve?: boolean; tickets?: boolean; checkIn?: boolean };
    ticketUrl?: string;
    bookingUrl?: string;
    region?: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    expiresAt?: Date;
}

export interface Venue {
    id: string;
    title: string;
    category: string;
    region: string;
    images: string[];
    type: string;
}

export type SectionId = "live" | "trending" | "today" | "week" | "featured";

export interface SectionConfig {
    id: SectionId;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: string;
}
