/**
 * MerveIntegrationSection - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Extracted hooks: useMerveConfig.ts
 * - Extracted components: MerveEnabledToggle, ActionList, ActionRow
 * - Behavior preserved: yes (no UI change)
 */

// Re-export IngestKind from the canonical source to avoid duplication
export type { IngestKind } from "../OfferingsManager/types";

export type MervePlaceType =
    | "restaurant" | "cafe" | "bar" | "hotel" | "villa" | "apartment"
    | "spa" | "gym" | "activity" | "tour" | "experience" | "event"
    | "service" | "grocery" | "pharmacy" | "gas_station" | "atm" | "other";

export type MerveActionType =
    | "order_food" | "reserve_table" | "book_stay" | "book_activity"
    | "request_service" | "order_supplies" | "register_event" | "inquire";

export interface MerveAction {
    id: string;
    actionType: MerveActionType;
    enabled: boolean;
    dispatch: { channel: "whatsapp"; toE164?: string; template?: string };
    data?: { kind?: import("../OfferingsManager/types").IngestKind; required?: boolean };
    tags?: string[];
    notes?: string;
}

export interface MerveConfig {
    enabled: boolean;
    actions: MerveAction[];
    whatsappE164?: string;
    geo?: { lat: number; lng: number };
    coverageAreas?: string[];
    tags?: string[];
}

export interface MerveIntegrationSectionProps {
    placeType: MervePlaceType;
    value: Partial<MerveConfig>;
    onChange: (config: MerveConfig) => void;
    lat?: number;
    lng?: number;
    listingId?: string;
    marketId?: string;
}
