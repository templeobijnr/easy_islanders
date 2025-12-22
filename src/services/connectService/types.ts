/**
 * connectService Types
 */
import type { Timestamp } from "firebase/firestore";
import type { Region, PinType } from "../../types";

export interface CheckIn {
    id: string;
    pinId: string;
    pinType: PinType;
    userId: string;
    userDisplayName?: string;
    userAvatarUrl?: string;
    timestamp: Timestamp;
    expiresAt: Timestamp;
}

export interface ConnectFeedItem {
    id: string;
    itemId?: string;
    title?: string;
    itemTitle?: string;
    description?: string;
    type?: string;
    itemType?: string;
    category?: string;
    region?: Region;
    startTime?: Timestamp | Date;
    endTime?: Timestamp | Date;
    images?: string[];
    itemImage?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    lat?: number;
    lng?: number;
    _status?: string;
    _badges?: string[];
    _curated?: boolean;
}

export interface ConnectFeedResult {
    liveNow: LiveVenue[];
    todayItems: ConnectFeedItem[];
    weekItems: ConnectFeedItem[];
    trendingItems: TrendingVenue[];
    featuredItems: ConnectFeedItem[];
}

export interface LiveVenue {
    id: string;
    title: string;
    category?: string;
    region?: Region;
    coordinates?: { lat: number; lng: number };
    images?: string[];
    checkInCount: number;
    recentCheckIns?: CheckIn[];
    _badges?: string[];
}

export interface TrendingVenue {
    id: string;
    title: string;
    category: string;
    region: Region;
    coordinates: { lat: number; lng: number };
    lat?: number;
    lng?: number;
    images: string[];
    address?: string;
    heatScore: number;
    recentCheckIns: number;
    recentReviews: number;
    _badges: string[];
}

// Collection names
export const CHECKINS_COLLECTION = "checkins";
export const JOINS_COLLECTION = "joins";
export const USER_ACTIVITIES_COLLECTION = "userActivities";
export const EVENTS_COLLECTION = "events";
export const ACTIVITIES_COLLECTION = "activities";
export const STAYS_COLLECTION = "stays";
export const EXPERIENCES_COLLECTION = "experiences";
