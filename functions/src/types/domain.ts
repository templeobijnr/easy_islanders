import { Timestamp } from 'firebase-admin/firestore';

export type ListingDomain = 'REAL_ESTATE' | 'AUTOMOTIVE' | 'EVENTS' | 'SERVICES';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'SUSPENDED';

export interface Listing {
    id: string;
    ownerId: string;
    domain: ListingDomain;
    status: ListingStatus;

    // Core Searchable Fields
    title: string;
    description: string;
    price: number;
    currency: 'GBP' | 'USD' | 'EUR' | 'TRY';

    // Geospatial
    location: {
        geohash: string;
        lat: number;
        lng: number;
        district: string;
        address?: string;
    };

    tags: string[];
    images: string[];

    // Polymorphic Metadata (The flexible part)
    metadata: Record<string, any>;

    // System
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Search Index Interface (What we send to Typesense later)
export interface SearchIndexRecord extends Omit<Listing, 'createdAt' | 'updatedAt' | 'metadata'> {
    created_at_timestamp: number;
    // We flatten metadata for search engines
    // e.g. metadata.bedrooms -> bedrooms
    [key: string]: any;
}

export interface SocialUser {
    id: string;
    name: string;
    avatar: string;
    rank: string;
    points: number;
    coordinates?: { lat: number; lng: number };
    currentMood?: string;
    interests?: string[];
    trustScore?: number;
}
