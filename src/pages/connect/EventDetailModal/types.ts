/**
 * EventDetailModal Types
 */
import type { FeedItem, Region } from "../../types/connect";

export interface EventDetailModalProps {
    item: FeedItem & {
        participantCount?: number;
        goingCount?: number;
        interestedCount?: number;
        actions?: {
            book?: boolean;
            tickets?: boolean;
            reserve?: boolean;
            rsvp?: boolean;
            share?: boolean;
            link?: boolean;
            urls?: Record<string, string>;
        };
        eventCategory?: string;
        locationName?: string;
        locationAddress?: string;
        hostVenueName?: string;
    };
    onClose: () => void;
    onCheckIn?: (id: string) => void;
}

export interface EventUserStatus {
    isGoing: boolean;
    isInterested: boolean;
    isCheckedIn: boolean;
    goingCount: number;
    interestedCount: number;
}
