/**
 * Admin-Controlled Catalog Types
 * 
 * These types define the Firestore collections that power Merve's tools.
 * All data is managed via the admin panel (Control Tower).
 */

import { Timestamp } from 'firebase-admin/firestore';
import type { ActionType } from './merve';

// ============================================================================
// RESTAURANTS
// ============================================================================

export interface Restaurant {
    id: string;
    name: string;
    whatsappE164: string;          // E.164 format: +905...
    phone?: string;                 // Display phone
    address: string;
    geo?: { lat: number; lng: number };
    cuisineTags: string[];          // ['Turkish', 'Kebab', 'Seafood']
    deliveryAreas: string[];        // ['Girne', 'Alsancak', 'Lapta']
    orderTemplate: string;          // WhatsApp message template
    priceRange?: 'budget' | 'mid' | 'premium';
    rating?: number;
    imageUrl?: string;
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface MenuItem {
    id: string;
    restaurantId: string;
    name: string;
    price: number;
    currency: 'TRY' | 'EUR' | 'GBP' | 'USD';
    category: string;               // 'Mains', 'Starters', 'Drinks', 'Desserts'
    description?: string;
    photoUrl?: string;
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// VENDORS (Water, Gas, Groceries)
// ============================================================================

export type VendorType = 'water' | 'gas' | 'groceries';

export interface Vendor {
    id: string;
    type: VendorType;
    name: string;
    whatsappE164: string;
    phone?: string;
    coverageAreas: string[];        // ['Girne', 'Lefkosa']
    template: string;               // WhatsApp dispatch template
    priceList?: PriceItem[];
    notes?: string;                 // 'Min order 2 bottles'
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PriceItem {
    item: string;                   // '19L Bottle', 'Gas Cylinder'
    price: number;
    currency: 'TRY' | 'EUR';
}

// ============================================================================
// SERVICE PROVIDERS (Plumber, Electrician, Handyman, AC, etc.)
// ============================================================================

export type ServiceType =
    | 'plumber'
    | 'electrician'
    | 'handyman'
    | 'ac_technician'
    | 'painter'
    | 'gardener'
    | 'cleaner'
    | 'locksmith'
    | 'pest_control'
    | 'pool_maintenance';

export interface ServiceProvider {
    id: string;
    name: string;
    whatsappE164: string;
    phone?: string;
    services: ServiceType[];         // Can offer multiple services
    coverageAreas: string[];
    template: string;                // WhatsApp dispatch template
    rating?: number;
    responseTime?: string;           // 'Usually responds in 30 min'
    languages?: string[];            // ['Turkish', 'English']
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// PHARMACIES ON DUTY (Daily)
// ============================================================================

export interface PharmacyOnDuty {
    name: string;
    address: string;
    phone: string;
    district: string;               // 'Girne', 'Lefkosa'
    geo?: { lat: number; lng: number };
}

export interface PharmacyDutyDoc {
    date: string;                   // 'YYYY-MM-DD'
    pharmacies: PharmacyOnDuty[];
    source?: string;                // 'manual' | 'scraped'
    updatedAt: Timestamp;
}

// ============================================================================
// NEWS CACHE
// ============================================================================

export interface NewsArticle {
    title: string;
    url: string;
    source: string;                 // 'Kıbrıs Postası', 'Havadis'
    publishedAt: string;            // ISO date
    summary?: string;
}

export interface NewsCacheDoc {
    articles: NewsArticle[];
    fetchedAt: Timestamp;
}

// ============================================================================
// ORDERS & SERVICE REQUESTS (Created by Merve)
// ============================================================================

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface FoodOrder {
    id: string;
    restaurantId: string;
    restaurantName: string;
    marketId?: string;
    actionType?: ActionType;
    userId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: {
        menuItemId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    totalAmount: number;
    currency: string;
    status: OrderStatus;
    dispatchMessageSid?: string;    // Twilio message ID for idempotency
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface ServiceRequest {
    id: string;
    providerId: string;
    providerName: string;
    marketId?: string;
    actionType?: ActionType;
    userId: string;
    customerName: string;
    customerPhone: string;
    serviceType: ServiceType;
    address: string;
    description: string;
    urgency: 'emergency' | 'today' | 'this_week' | 'flexible';
    status: OrderStatus;
    dispatchMessageSid?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// COLLECTION PATHS
// ============================================================================

export const COLLECTIONS = {
    restaurants: 'restaurants',
    menuItems: (restaurantId: string) => `restaurants/${restaurantId}/menu`,
    vendors: 'vendors',
    serviceProviders: 'service_providers',
    pharmaciesOnDuty: 'pharmacies_on_duty',
    newsCache: 'news_cache',
    foodOrders: 'food_orders',
    serviceRequests: 'service_requests',
} as const;
