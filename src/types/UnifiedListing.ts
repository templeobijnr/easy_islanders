/**
 * UnifiedListing - Single model replacing Stays, Activities, Places, Events, Experiences
 * 
 * This enables scalable onboarding where all business types use the same structure,
 * with inquiry-based booking via WhatsApp.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// UNIFIED LISTING TYPE
// ============================================================================

export type ListingType = 'place' | 'activity' | 'event' | 'stay' | 'experience';

export interface UnifiedListing {
    id: string;

    // === Type & Category ===
    type: ListingType;
    category: string;           // 'restaurants', 'spas_wellness', 'hotels_stays', etc.
    subcategory?: string;       // 'italian', 'thai_massage', etc.

    // === Core Info (auto-imported from Google) ===
    title: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    region: string;             // 'Kyrenia', 'Famagusta', etc. (DEPRECATED: use location)
    cityId: string;             // 'north-cyprus'

    // === Structured Location (NEW) ===
    locationId?: string;        // 'kyrenia-girne' - composite ID
    location?: {                // Denormalized for fast display
        id: string;             // Same as locationId
        label: string;          // 'Girne, Kyrenia'
        type: 'region' | 'subregion';
        regionId: string;
        subRegionId?: string;
    };
    legacyMigrated?: boolean;   // True if migrated from string region

    // === Contact (required for WhatsApp bookings) ===
    phone?: string;             // Business phone for WhatsApp
    email?: string;
    website?: string;

    // === Display ===
    images: string[];
    rating?: number;            // 1-5 from Google
    reviewCount?: number;
    priceLevel?: number;        // 1-4 from Google
    displayPrice?: string;      // "From $20", "$$", "Free", "Price on request"
    openingHours?: string[];    // Weekday text from Google

    // === Booking Configuration ===
    bookingEnabled: boolean;    // Whether users can request bookings
    bookingOptions: BookingOptions;

    // === Merve Integration ===
    merve?: any; // MerveConfig


    // === Quick Actions (what buttons to show on listing card) ===
    actions: ListingActions;

    // === Map Display ===
    showOnMap: boolean;         // Whether to display pin on Connect map

    // === Metadata ===
    googlePlaceId?: string;     // For updates/re-import
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    approved: boolean;
    featured?: boolean;
}

// ============================================================================
// BOOKING OPTIONS - What info to collect when user books
// ============================================================================

export interface BookingOptions {
    needsDate: boolean;         // Almost always true
    needsTime: boolean;         // For time-specific bookings (bowling, spa, restaurant)
    needsGuests: boolean;       // How many people
    needsDuration: boolean;     // For session-based (1hr, 2hr, etc.)

    // Custom fields for specific business types
    customFields?: CustomBookingField[];

    // Time slot configuration
    timeSlots?: string[];       // ['09:00', '10:00', '11:00', ...] if fixed slots
    minGuests?: number;
    maxGuests?: number;

    // Duration options
    durationOptions?: string[]; // ['30 min', '1 hour', '2 hours']
}

export interface CustomBookingField {
    id: string;                 // 'lanes', 'vip', 'laps'
    label: string;              // 'Number of Lanes', 'VIP Section?', 'Number of Laps'
    type: 'number' | 'select' | 'text' | 'checkbox';
    options?: string[];         // For select type: ['Regular', 'VIP']
    required?: boolean;
    defaultValue?: string | number | boolean;
}

// ============================================================================
// LISTING ACTIONS - What buttons to show
// ============================================================================

export interface ListingActions {
    call: boolean;              // Show call button
    navigate: boolean;          // Show directions/navigate button
    book: boolean;              // Show "Check Availability" button
    whatsapp: boolean;          // Show direct WhatsApp button
    website: boolean;           // Show website link
    share: boolean;             // Show share button
}

// ============================================================================
// BOOKING REQUEST - User's inquiry to a business
// ============================================================================

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'expired';

export interface BookingRequest {
    id: string;
    shortCode: string;          // Last 4 chars of ID for easy WhatsApp reference

    // === References ===
    listingId: string;
    listingTitle: string;       // Denormalized for quick display
    listingCategory: string;
    userId: string;
    userPhone: string;
    userName: string;

    // === User's Selection ===
    date: string;               // ISO date string 'YYYY-MM-DD'
    time?: string;              // '19:00'
    guests: number;
    duration?: string;          // '1 hour'
    customFields?: Record<string, string | number | boolean>;
    userMessage?: string;       // Optional note from user

    // === Status ===
    status: BookingStatus;

    // === Business Response (filled when they reply) ===
    confirmedPrice?: number;
    currency?: string;
    businessMessage?: string;
    respondedAt?: Timestamp | Date;

    // === Timestamps ===
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    expiresAt?: Timestamp | Date; // Auto-decline if business doesn't respond
}

// ============================================================================
// DEFAULT VALUES - For creating new listings
// ============================================================================

export const DEFAULT_BOOKING_OPTIONS: BookingOptions = {
    needsDate: true,
    needsTime: false,
    needsGuests: true,
    needsDuration: false,
    minGuests: 1,
    maxGuests: 20,
};

export const DEFAULT_LISTING_ACTIONS: ListingActions = {
    call: true,
    navigate: true,
    book: true,
    whatsapp: true,
    website: true,
    share: true,
};

// ============================================================================
// CATEGORY PRESETS - Pre-configured booking options by category
// ============================================================================

export const CATEGORY_BOOKING_PRESETS: Record<string, Partial<BookingOptions>> = {
    restaurants: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        timeSlots: ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00'],
    },
    spas_wellness: {
        needsDate: true,
        needsTime: true,
        needsDuration: true,
        durationOptions: ['30 min', '60 min', '90 min', '120 min'],
        customFields: [
            { id: 'service', label: 'Service Type', type: 'select', options: ['Massage', 'Facial', 'Body Treatment', 'Other'], required: true }
        ],
    },
    bowling_recreation: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        needsDuration: true,
        durationOptions: ['1 hour', '2 hours'],
        customFields: [
            { id: 'lanes', label: 'Number of Lanes', type: 'number', required: true, defaultValue: 1 }
        ],
    },
    hotels_stays: {
        needsDate: true,
        needsTime: false,
        needsGuests: true,
        customFields: [
            { id: 'nights', label: 'Number of Nights', type: 'number', required: true, defaultValue: 1 },
            { id: 'rooms', label: 'Number of Rooms', type: 'number', required: true, defaultValue: 1 },
        ],
    },
    nightlife: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'vip', label: 'VIP Table?', type: 'checkbox', defaultValue: false }
        ],
    },
    beaches: {
        needsDate: true,
        needsGuests: true,
        customFields: [
            { id: 'sunbed', label: 'Sunbed Reservation?', type: 'checkbox', defaultValue: true }
        ],
    },
    water_activities: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'activity', label: 'Activity', type: 'select', options: ['Boat Tour', 'Diving', 'Jet Ski', 'Kayak', 'Parasailing', 'Other'], required: true }
        ],
    },
    car_rentals: {
        needsDate: true,
        customFields: [
            { id: 'days', label: 'Number of Days', type: 'number', required: true, defaultValue: 1 },
            { id: 'pickup', label: 'Pickup Location', type: 'text', required: true },
        ],
    },
    cinemas_theaters: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'movie', label: 'Movie/Show Name', type: 'text' }
        ],
    },
    // New Activity Categories
    gyms_fitness: {
        needsDate: true,
        needsTime: true,
        needsDuration: true,
        durationOptions: ['Day Pass', 'Week Pass', 'Month Pass'],
    },
    adventure_sports: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'activity', label: 'Activity', type: 'select', options: ['Paragliding', 'Zipline', 'Bungee Jump', 'Rock Climbing', 'Other'], required: true }
        ],
    },
    motor_activities: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        needsDuration: true,
        durationOptions: ['15 min', '30 min', '1 hour'],
        customFields: [
            { id: 'activity', label: 'Activity', type: 'select', options: ['Go-Karting', 'Quad Biking', 'ATV', 'Buggy', 'Other'], required: true }
        ],
    },
    shooting_sports: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'activity', label: 'Activity', type: 'select', options: ['Paintball', 'Archery', 'Shooting Range', 'Laser Tag', 'Other'], required: true }
        ],
    },
    golf_tennis: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        needsDuration: true,
        durationOptions: ['1 hour', '2 hours', 'Half Day', 'Full Day'],
    },
    horse_riding: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        needsDuration: true,
        durationOptions: ['30 min', '1 hour', '2 hours', 'Half Day'],
    },
    yoga_meditation: {
        needsDate: true,
        needsTime: true,
        needsDuration: true,
        durationOptions: ['1 hour', '90 min', '2 hours'],
    },
    escape_rooms: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        minGuests: 2,
        maxGuests: 8,
    },
    amusement_parks: {
        needsDate: true,
        needsGuests: true,
    },
    outdoor_activities: {
        needsDate: true,
        needsTime: true,
        needsGuests: true,
        customFields: [
            { id: 'activity', label: 'Activity', type: 'select', options: ['Hiking', 'Cycling', 'Nature Walk', 'Camping', 'Other'], required: true }
        ],
    },
    beach_clubs: {
        needsDate: true,
        needsGuests: true,
        customFields: [
            { id: 'sunbed', label: 'Sunbed Reservation?', type: 'checkbox', defaultValue: true },
            { id: 'vip', label: 'VIP Area?', type: 'checkbox', defaultValue: false }
        ],
    },
    other_activities: {
        needsDate: true,
        needsTime: false,
        needsGuests: true,
    },
};
