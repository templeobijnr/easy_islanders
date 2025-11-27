/**
 * Tool Arguments Type Definitions
 *
 * These interfaces define the expected structure of arguments for each tool function.
 * This ensures type safety and helps catch errors at compile time instead of runtime.
 */

// Taxi/Transport Tools
export interface RequestTaxiArgs {
    pickupAddress: string;
    pickupDistrict: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffAddress: string;
    customerName?: string;
    customerPhone?: string;
    priceEstimate?: number;
}

export interface DispatchTaxiArgs {
    pickupLocation: string;
    destination: string;
    customerName?: string;
    customerContact?: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    notes?: string;
}

// Booking Tools
export interface CreateBookingArgs {
    itemId: string;
    itemTitle: string;
    domain: string;
    customerName: string;
    customerContact?: string;
    date: string;
    totalPrice: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    quantity?: number;
    specialRequests?: string;
}

export interface ScheduleViewingArgs {
    listingId: string;
    customerName: string;
    customerContact: string;
    preferredSlot: string;
    notes?: string;
}

// Search Tools
export interface SearchListingsArgs {
    query?: string;
    domain?: string;
    category?: string;
    subCategory?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    priceMin?: number;
    priceMax?: number;
    limit?: number;
    perPage?: number;
}

export interface SearchLocalPlacesArgs {
    query?: string;
    domain?: string;
    location?: string;
}

export interface SearchEventsArgs {
    query?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
}

// Communication Tools
export interface SendWhatsAppArgs {
    recipient: string;
    message: string;
    userId?: string;
}

// Payment Tools
export interface CreatePaymentIntentArgs {
    bookingId: string;
}

// Consumer Request Tools
export interface CreateConsumerRequestArgs {
    content: string;
    domain: string;
    budget?: number;
}

// Real-time Info Tools
export interface GetRealTimeInfoArgs {
    category: 'weather' | 'exchange_rate' | 'events' | 'traffic';
    location?: string;
}

// Map Tools
export interface FindNearbyArgs {
    lat: number;
    lng: number;
    category: string;
    radius?: number;
}

// Import/Scraping Tools
export interface ImportListingArgs {
    url: string;
    domain?: string;
    forceAiOnly?: boolean;
}

/**
 * Union type of all possible tool arguments
 * Useful for generic tool handler functions
 */
export type ToolArgs =
    | RequestTaxiArgs
    | DispatchTaxiArgs
    | CreateBookingArgs
    | ScheduleViewingArgs
    | SearchListingsArgs
    | SearchLocalPlacesArgs
    | SearchEventsArgs
    | SendWhatsAppArgs
    | CreatePaymentIntentArgs
    | CreateConsumerRequestArgs
    | GetRealTimeInfoArgs
    | FindNearbyArgs
    | ImportListingArgs;

/**
 * Tool resolver function signature
 */
export type ToolResolver<T = any> = (args: T, userId?: string) => Promise<any>;
