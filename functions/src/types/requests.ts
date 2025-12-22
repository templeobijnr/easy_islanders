import * as admin from 'firebase-admin';

export type RequestType =
    | 'TAXI'
    | 'HOUSING'
    | 'SERVICE'
    | 'ORDER'
    | 'CAR_RENTAL'
    | 'OTHER';

export type ServiceCategory =
    | 'HOME_PROPERTY'
    | 'TECH_DIGITAL'
    | 'LEGAL_ADMIN'
    | 'TRANSPORT_SHOPPING'
    | 'PACKAGE_DELIVERY'
    | 'LIFESTYLE_CONCIERGE';

export type ServiceSubcategory =
    | 'HANDYMAN'
    | 'PLUMBING'
    | 'CLEANING'
    | 'WIFI_SETUP'
    | 'RESIDENCY_VISA'
    | 'PERSONAL_SHOPPING'
    | 'LAUNDRY'
    | 'EVENT_PLANNING';

export type RequestStatus =
    | 'new'
    | 'in_progress'
    | 'waiting_on_user'
    | 'waiting_on_provider'
    | 'resolved'
    | 'cancelled';

export interface OrderDetails {
    type: 'water' | 'gas' | 'grocery';
    // For water/gas
    bottleSizeLiters?: number;
    quantity?: number;
    // For groceries
    items?: string[];                  // "milk, bread, eggs"
    notes?: string;
}

export interface HousingDetails {
    intent?: 'rent' | 'buy' | 'invest';
    budgetMin?: number;
    budgetMax?: number;
    bedrooms?: number;
    furnished?: boolean;
    areasPreferred?: string[];
    notes?: string;
}

export interface TaxiDetails {
    passengers?: number;
    rideType?: 'daily' | 'airport' | 'event';
    notes?: string;
}

export interface ServiceDetails {
    title?: string;
    description: string;
}

export interface Request {
    id: string;
    cityId: string;
    type: RequestType;
    userId: string;

    // Routing
    assignedProviderId?: string;          // /serviceProviders/{id}
    status: RequestStatus;

    // Time
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
    scheduledAt?: admin.firestore.Timestamp;

    // Location context (optional)
    origin?: {
        lat?: number;
        lng?: number;
        placeId?: string;
        addressText?: string;
    };
    destination?: {
        lat?: number;
        lng?: number;
        placeId?: string;
        addressText?: string;
    };

    // Typed details
    housing?: HousingDetails;
    taxi?: TaxiDetails;
    service?: ServiceDetails;
    order?: OrderDetails;

    // Generic meta
    meta?: Record<string, any>;

    internalNotes?: string;
}
