/**
 * MessagesView - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useMessages.ts (subscription + send), useBookings.ts
 * - Extracted components: BookingList, BookingRow, MessageThread, MessageComposer
 * - Extracted utils: parseDate
 * - Behavior preserved: yes (no UI change)
 */
export interface BookingSummary {
    id: string;
    catalogType?: "stay" | "activity" | "event" | "place" | "experience";
    itemTitle?: string;
    stayId?: string;
    activityId?: string;
    eventId?: string;
    placeId?: string;
    experienceId?: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
    guests?: number;
    status?: "pending" | "confirmed" | "cancelled" | "completed";
    totalPrice?: number;
    currency?: string;
    guestDetails?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        message?: string;
    };
}

export interface BookingMessage {
    id: string;
    body: string;
    direction: "inbound" | "outbound";
    channel?: string;
    from?: string;
    senderRole?: string;
    userId?: string;
    createdAt?: Date | null;
}

export interface MessagesViewProps {
    // Currently no props needed
}
