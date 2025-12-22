import * as admin from 'firebase-admin';

export type PlaceCategory =
    | 'food'
    | 'nightlife'
    | 'sight'
    | 'cafe'
    | 'shopping'
    | 'service'
    | 'other';

// /places/{placeId}
export interface Place {
    id: string;
    cityId: string;                         // 'north-cyprus'

    name: string;
    category: PlaceCategory;
    coordinates: { lat: number; lng: number };
    addressText?: string;

    descriptionShort?: string;
    tags?: string[];                        // ['students', 'sunset', 'shisha']

    // Contact / booking
    phone?: string;
    whatsapp?: string;
    website?: string;
    instagram?: string;

    bookingType?: 'none' | 'whatsapp' | 'link' | 'internal';
    bookingTarget?: string;                // number, URL, or partnerId

    isFeatured?: boolean;
    isActive: boolean;

    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export type ActivityStatus = 'pending' | 'approved' | 'rejected';

export interface Activity {
    id: string;
    cityId: string;

    title: string;
    description?: string;

    placeId: string;                       // anchor to a Place
    coordinates: { lat: number; lng: number };

    category: 'nightlife' | 'day_trip' | 'tour' | 'meetup' | 'other';
    startsAt: admin.firestore.Timestamp;
    endsAt?: admin.firestore.Timestamp;

    price?: number;
    currency?: string;
    isFree: boolean;

    bookingType: 'whatsapp' | 'link' | 'internal';
    bookingTarget: string;

    status: ActivityStatus;
    createdByUserId: string;

    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}
