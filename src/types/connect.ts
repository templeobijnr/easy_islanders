import { Timestamp } from 'firebase/firestore';

export type Region = 'kyrenia' | 'famagusta' | 'nicosia' | 'karpaz' | 'lefke' | 'guzelyurt';
export type PinType = 'place' | 'activity' | 'event' | 'trip' | 'stay' | 'experience';

// ... (existing interfaces)

export interface Experience extends BasePin {
    type: 'experience';
    duration?: string; // e.g. "2 hours"
    difficulty?: 'easy' | 'medium' | 'hard';
    included?: string[];
    requirements?: string[];
}

// ... (existing interfaces)

export type FeedItem = Place | Activity | Event | Trip | Stay | Experience;

export interface PinActionConfig {
    allowCheckIn?: boolean;
    allowJoin?: boolean;
    allowWave?: boolean;
    allowBooking?: boolean;
    allowTaxi?: boolean;
}

export interface BasePin {
    id: string;
    title: string;
    description: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    category: string;
    region: Region;
    images: string[];
    actions: PinActionConfig;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;

    // Common optional fields for Catalog
    price?: number;
    currency?: string;
    address?: string;
    cityId?: string;
}

export interface Place extends BasePin {
    type: 'place';
}

export interface Activity extends BasePin {
    type: 'activity';
    startTime?: Timestamp | Date;
    endTime?: Timestamp | Date;
    createdBy?: string; // userId if user-created
    approved: boolean;
}

export interface Event extends BasePin {
    type: 'event';
    startTime: Timestamp | Date;
    endTime?: Timestamp | Date;
    isPublic: boolean;
    createdBy?: string; // userId or admin
    approved: boolean;
}

export interface Trip extends BasePin {
    type: 'trip';
    stops: string[]; // Array of pinIds
    startTime: Timestamp | Date;
    isPublic: boolean;
    createdBy: string;
    approved: boolean;
}

export interface Stay extends BasePin {
    type: 'stay';
    propertyType: string; // Villa, Hotel, etc.
    bedrooms?: number;
    bathrooms?: number;
    billingPeriod?: 'night' | 'month' | 'year';
    amenities?: string[];
    hostName?: string;
    hostPhone?: string;
    hostEmail?: string;
    requestOnly?: boolean;
}

export interface CheckIn {
    id: string;
    userId: string;
    userDisplayName?: string;
    userAvatarUrl?: string;
    pinType: PinType;
    pinId: string;
    checkedInAt: Timestamp | Date;
    expiresAt: Timestamp | Date;
}

export interface Join {
    id: string;
    userId: string;
    pinId: string;
    pinType: PinType;
    joinedAt: Timestamp | Date;
}



export interface Booking {
    id: string;
    userId: string;
    // Canonical catalog linkage
    catalogType?: 'stay' | 'activity' | 'event' | 'place' | 'experience';
    itemTitle?: string;

    stayId?: string;
    activityId?: string;
    eventId?: string;
    experienceId?: string;
    placeId?: string;
    startDate: Timestamp | Date;
    endDate?: Timestamp | Date; // Optional for single-day events/activities
    guests: number;
    totalPrice: number;
    currency: string;
    status: 'requested' | 'pending' | 'confirmed' | 'cancelled';
    guestDetails?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        message?: string;
    };
    // denormalised stay + host info for messaging (legacy naming; used as "listing title")
    stayTitle?: string;
    stayHostName?: string;
    stayHostPhone?: string;
    stayHostEmail?: string;
    hostReplyStatus?: 'accepted' | 'declined';
    hostReplyBody?: string;
    hostLastReplyAt?: Timestamp | Date | string;
    adminNotes?: string;
    createdAt: Timestamp | Date;
}

// ============================================================================
// Connect Feed v1 Types
// ============================================================================

export type ActivityStatus = 'upcoming' | 'live' | 'past';

/**
 * LiveVenue - A venue with active check-ins
 * Shows "where the action is" in the feed
 */
export interface LiveVenue {
    listingId: string;
    title: string;
    category: string;
    region: Region;
    coordinates: { lat: number; lng: number };
    checkInCount: number;
    recentAvatars: string[];  // First 3 avatars
    recentNames: string[];    // First 3 names
    images: string[];
    address?: string;
}

/**
 * Activity categories
 */
export type ActivityCategory = 'social' | 'sports' | 'food' | 'music' | 'outdoors' | 'wellness' | 'culture' | 'other';

/**
 * UserActivity - Enhanced user-created activity/event
 * Supports images, flexible timing, categories, and RSVP
 */
export interface UserActivity {
    id: string;
    title: string;
    description?: string;
    category: ActivityCategory;

    // Location - either linked to venue OR free-form
    listingId?: string;
    listingTitle?: string;
    freeformLocation?: string;
    coordinates?: { lat: number; lng: number };
    region: Region;

    // Flexible Timing
    startDate: Timestamp | Date;
    endDate?: Timestamp | Date;
    isAllDay?: boolean;

    // Media
    images: string[];
    coverImage?: string;

    // Host info
    hostUserId: string;
    hostName: string;
    hostAvatar: string;

    // Engagement / RSVP
    goingCount: number;
    interestedCount: number;
    goingUserIds: string[];
    interestedUserIds: string[];

    // Status & Visibility
    status: ActivityStatus;
    visibility: 'public' | 'friends' | 'private';

    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

// Keep QuickActivity as alias for backward compatibility
export type QuickActivity = UserActivity;

/**
 * Feed item types for Connect Feed v1
 */
export type ConnectFeedItem = LiveVenue | UserActivity | CheckIn;

