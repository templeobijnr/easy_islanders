/**
 * BookingsDeck - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useBookingsDeck.ts (subscription + actions)
 * - Extracted components: BookingCard
 * - Behavior preserved: yes (no UI change)
 */
import type { Booking, Stay } from "../../../types/connect";

export interface BookingWithStay extends Booking {
    catalogType?: "stay" | "activity" | "event" | "place" | "experience";
    itemTitle?: string;
    stayTitle?: string;
    hostName?: string;
    hostPhone?: string;
    hostEmail?: string;
}

export interface BookingsDeckProps {
    // Currently no props
}

export type { Booking, Stay };
