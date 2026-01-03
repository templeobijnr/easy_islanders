/**
 * Connect API Service
 * Connects mobile app to backend connect endpoints (feed, venues, checkin)
 */

import auth from '@react-native-firebase/auth';
import { api } from '../apiClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
    'https://us-central1-merve-app-nc.cloudfunctions.net/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UserActivity {
    id: string;
    type: string;
    userId: string;
    userName?: string;
    pinId: string;
    pinType: string;
    pinTitle?: string;
    createdAt: string;
    expiresAt?: string;
}

export interface LiveVenue {
    id: string;
    pinId: string;
    pinType: string;
    title: string;
    lat?: number;
    lng?: number;
    checkinCount: number;
}

export interface FeedResponse {
    items: UserActivity[];
    hasMore: boolean;
    cursor: string | null;
}

export interface VenuesResponse {
    venues: LiveVenue[];
}

export interface FeedQuery {
    region?: string;
    limit?: number;
}

export interface CheckInInput {
    pinId: string;
    pinType: 'place' | 'stay' | 'event' | 'experience';
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
 * Get activity feed
 */
export async function getFeed(query?: FeedQuery): Promise<FeedResponse> {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (query?.region) params.append('region', query.region);
    if (query?.limit) params.append('limit', String(query.limit));

    const url = `${API_BASE_URL}/v1/connect/feed${params.toString() ? '?' + params.toString() : ''}`;
    const resp = await api.get<FeedResponse>(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data;
}

/**
 * Get live venues with active checkins
 */
export async function getLiveVenues(region?: string): Promise<LiveVenue[]> {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (region) params.append('region', region);

    const url = `${API_BASE_URL}/v1/connect/live-venues${params.toString() ? '?' + params.toString() : ''}`;
    const resp = await api.get<VenuesResponse>(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data.venues;
}

/**
 * Check in to a pin/venue
 */
export async function checkIn(input: CheckInInput): Promise<void> {
    const token = await getAuthToken();
    await api.post<{ ok: true }>(
        `${API_BASE_URL}/v1/connect/checkin`,
        input,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
}

