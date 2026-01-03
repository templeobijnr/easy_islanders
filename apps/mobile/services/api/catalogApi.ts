/**
 * Catalog API Service
 * Connects mobile app to backend catalog endpoints
 */

import auth from '@react-native-firebase/auth';
import { api } from '../apiClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
    'https://us-central1-merve-app-nc.cloudfunctions.net/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Listing {
    id: string;
    type?: string;
    category?: string;
    title: string;
    description?: string;
    images?: string[];
    address?: string;
    lat?: number;
    lng?: number;
    region?: string;
    approved?: boolean;
    bookingEnabled?: boolean;
}

export interface ListingsResponse {
    listings: Listing[];
    total: number;
    hasMore: boolean;
    cursor: string | null;
}

export interface ListingDetailResponse {
    listing: Listing;
}

export interface ListingsQuery {
    type?: string;
    region?: string;
    category?: string;
    approved?: boolean;
    limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.getIdToken();
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get listings with optional filters
 */
export async function getListings(query?: ListingsQuery): Promise<ListingsResponse> {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (query?.type) params.append('type', query.type);
    if (query?.region) params.append('region', query.region);
    if (query?.category) params.append('category', query.category);
    if (query?.approved !== undefined) params.append('approved', String(query.approved));
    if (query?.limit) params.append('limit', String(query.limit));

    const url = `${API_BASE_URL}/v1/catalog/listings${params.toString() ? '?' + params.toString() : ''}`;
    const resp = await api.get<ListingsResponse>(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data;
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<Listing> {
    const token = await getAuthToken();
    const resp = await api.get<ListingDetailResponse>(`${API_BASE_URL}/v1/catalog/listings/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data.listing;
}

