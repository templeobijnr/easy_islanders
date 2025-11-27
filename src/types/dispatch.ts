/**
 * Dispatch system types for City OS.
 *
 * These describe the server‑side Firestore documents used for
 * taxi bookings, grocery orders and service/handyman requests.
 *
 * They are shared between:
 *  - Cloud Functions (tool resolvers, vendorReply.service)
 *  - Frontend dashboards (business views, ops monitoring)
 */

import { Timestamp } from 'firebase/firestore';

/** Common status codes across all dispatch flows. */
export type DispatchStatus =
  | 'pending'
  | 'confirmed'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

/** Simple coordinate pair scoped to dispatch flows (avoids clash with locations.Coordinates). */
export interface DispatchCoordinates {
  lat: number;
  lng: number;
}

/** Human‑readable location enriched with geometry. */
export interface Location {
  address: string;
  coordinates?: DispatchCoordinates;
  placeId?: string;
  placeName?: string;
}

/** Base fields shared by all dispatch documents. */
export interface BaseDispatch {
  id: string;
  userId: string | null;
  customerName: string;
  customerContact: string;
  status: DispatchStatus;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
  completedAt?: Timestamp | string;
  cancelledAt?: Timestamp | string;
}

/** Taxi booking created by `dispatchTaxi` / requestTaxi tools. */
export interface TaxiBooking extends BaseDispatch {
  // Locations
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;

  // Timing
  pickupTime?: string;
  estimatedDuration?: number; // minutes

  // Taxi details
  taxiListingId: string;
  taxiTitle: string;
  taxiDetails: {
    title: string;
    vehicleModel: string;
    vehicleColor: string;
    plateNumber: string;
    vehicleType: string;
    capacity: number;
    rating: number;
    phone: string;
  };

  // Driver interaction
  driverLastMessage?: string;
  driverConfirmedAt?: Timestamp | string;
  driverArrivedAt?: Timestamp | string;

  // Additional info
  notes?: string;
  passengerCount?: number;
  luggage?: boolean;
}

/** Grocery / household order sent to a market vendor. */
export interface GroceryOrder extends BaseDispatch {
  // Items
  items: string; // "2 water bottles, 1 gas cylinder, bread"

  // Delivery
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryNotes?: string;

  // Vendor
  vendorId: string;
  vendorName: string;
  vendorPhone: string;

  // Vendor interaction
  vendorLastMessage?: string;
  vendorConfirmedAt?: Timestamp | string;
  vendorDispatchedAt?: Timestamp | string;

  // Pricing (optional)
  estimatedTotal?: number;
  actualTotal?: number;
  currency?: string;
}

/** Request for a plumber/electrician/handyman etc. */
export interface ServiceRequest extends BaseDispatch {
  // Service details
  serviceType: 'plumber' | 'electrician' | 'cleaner' | 'ac_tech' | 'handyman' | 'painter' | 'gardener';
  description: string;
  urgency: 'emergency' | 'today' | 'this_week' | 'flexible';

  // Location
  location: string;
  locationLat?: number;
  locationLng?: number;
  accessInstructions?: string;

  // Service provider
  providerId: string;
  providerName: string;
  providerPhone: string;

  // Provider interaction
  providerLastMessage?: string;
  providerConfirmedAt?: Timestamp | string;
  providerArrivedAt?: Timestamp | string;

  // Job details
  estimatedCost?: number;
  actualCost?: number;
  duration?: number; // minutes
  currency?: string;

  // Photos
  photos?: string[]; // URLs to uploaded photos
}

/** Common shape returned after creating any dispatch entity. */
export interface DispatchResult {
  success: boolean;
  booking: {
    id: string;
    status: DispatchStatus;
    message: string;
    taxiInfo?: {
      name: string;
      vehicle: string;
      plateNumber: string;
      rating: number;
    };
    vendorInfo?: {
      name: string;
      phone: string;
    };
  };
  whatsappStatus?: string;
  error?: string;
}

/** Parsed view of a vendor response (via WhatsApp). */
export interface VendorResponse {
  bookingId: string;
  vendorPhone: string;
  message: string;
  responseType: 'confirm' | 'reject' | 'arrived' | 'completed' | 'update';
  timestamp: string;
}

/** Filters used when querying dispatch collections. */
export interface DispatchFilters {
  status?: DispatchStatus | DispatchStatus[];
  userId?: string;
  vendorPhone?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
