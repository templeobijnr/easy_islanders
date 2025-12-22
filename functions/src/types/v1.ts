/**
 * V1 Core Data Models
 * Based on Easy Islanders V1 Product Specification
 */

// ============================================================================
// 1. IDENTITY & SEGMENTATION
// ============================================================================

export type UserType = 'student' | 'expat' | 'traveller' | 'local';

export interface City {
  id: string;
  name: string;
  country: string;
  timeZone: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: { lat: number; lng: number };
  isActive: boolean;
  defaultCurrency: string;
  primaryLanguage: string;
  supportedUserTypes: UserType[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  userType: UserType;

  // Core location context
  currentCityId: string;
  homeCityId?: string;

  // Student-specific
  universityId?: string;
  universityName?: string;
  campusName?: string;
  faculty?: string;
  program?: string;
  yearOfStudy?: number;
  dormName?: string;

  // Expat-specific
  originCountry?: string;
  lengthOfStayMonths?: number;
  workMode?: 'remote' | 'on-site' | 'mixed';
  primaryReason?: 'work' | 'retirement' | 'investment' | 'other';

  // Traveller/visitor-specific
  stayStartDate?: string;
  stayEndDate?: string;
  travelStyle?: ('budget' | 'midrange' | 'luxury')[];
  interests?: string[];

  // Local-specific
  neighborhoodId?: string;
  hasCar?: boolean;

  // General preferences
  preferences?: {
    nightlifeIntensity?: 'low' | 'medium' | 'high';
    noiseTolerance?: 'quiet' | 'normal' | 'vibrant';
    likesCrowds?: boolean;
    maxBudgetHousing?: number;
    preferredAreas?: string[];
  };

  // Current location (for Connect map)
  currentLocation?: {
    placeId?: string;
    lat?: number;
    lng?: number;
    updatedAt: string;
  };

  completedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface University {
  id: string;
  cityId: string;
  name: string;
  shortName?: string;
  campuses: {
    id: string;
    name: string;
    coordinates?: { lat: number; lng: number };
  }[];
}

// ============================================================================
// 2. TERRITORY & GEOGRAPHY
// ============================================================================

export type PlaceCategory =
  | 'food'
  | 'nightlife'
  | 'sight'
  | 'cafe'
  | 'co_working'
  | 'shopping'
  | 'service'
  | 'housing_project'
  | 'other';

export interface Place {
  id: string;
  cityId: string;
  areaId?: string;

  name: string;
  category: PlaceCategory;
  subcategory?: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  areaName?: string;

  descriptionShort?: string;
  descriptionLong?: string;
  images?: string[];
  tags?: string[];

  // Contact
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;

  // Booking
  bookingType?: 'none' | 'whatsapp' | 'link' | 'internal';
  bookingTarget?: string;

  // Actions
  actions: {
    taxiEnabled: boolean;
    reservationsEnabled: boolean;
    activityBookingEnabled: boolean;
    serviceTypes?: string[];
  };

  // Meta
  averagePriceLevel?: 1 | 2 | 3 | 4;
  ratingAverage?: number;
  ratingCount?: number;

  isFeatured?: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Area {
  id: string;
  cityId: string;
  name: string;
  type: 'neighborhood' | 'district' | 'campus' | 'region';
  coordinates: { lat: number; lng: number };
  polygon?: any; // GeoJSON
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 3. ACTIVITIES & EVENTS
// ============================================================================

export type ActivityCategory = 'nightlife' | 'social' | 'sport' | 'culture' | 'food' | 'other';

export interface Activity {
  id: string;
  cityId: string;

  title: string;
  description?: string;
  category: ActivityCategory;

  placeId?: string;
  coordinates: { lat: number; lng: number };

  startsAt: string;
  endsAt?: string;

  price?: number;
  currency?: string;
  isFree: boolean;

  hostUserId?: string;
  hostName?: string;
  hostContactWhatsApp?: string;

  bookingType: 'none' | 'whatsapp' | 'link' | 'internal';
  bookingTarget?: string;

  images?: string[];

  status: 'pending' | 'approved' | 'rejected';

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// 4. LISTINGS (Housing, Cars)
// ============================================================================

export type ListingKind = 'housing' | 'car_rental';
export type PriceUnit = 'per_month' | 'per_night' | 'per_day' | 'total';

export interface Listing {
  id: string;
  cityId: string;
  kind: ListingKind;

  title: string;
  description?: string;
  images?: string[];

  price: number;
  currency: string;
  priceUnit: PriceUnit;
  tags?: string[];

  // Housing-specific
  housing?: {
    type: 'apartment' | 'villa' | 'room' | 'studio';
    bedrooms: number;
    bathrooms?: number;
    furnished?: boolean;
    areaName?: string;
    nearPlaceId?: string;
    agentId?: string;
    minStayMonths?: number;
    sizeSqm?: number;
    floor?: number;
  };

  // Car rental-specific
  carRental?: {
    providerId?: string;
    carType: 'small' | 'sedan' | 'SUV' | 'van' | 'other';
    transmission?: 'manual' | 'automatic';
    seats?: number;
    mileageLimitPerDay?: number;
  };

  // Partner & booking
  bookingType: 'whatsapp' | 'link' | 'internal';
  bookingTarget: string;

  coordinates?: { lat: number; lng: number };
  areaId?: string;

  isActive: boolean;
  isFeatured?: boolean;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// 5. SERVICE PROVIDERS / PARTNERS
// ============================================================================

export type PartnerType =
  | 'taxi_company'
  | 'driver'
  | 'water_vendor'
  | 'gas_vendor'
  | 'grocer'
  | 'venue'
  | 'tour_operator'
  | 'real_estate_agent'
  | 'landlord';

export interface ServiceProvider {
  id: string;
  cityId: string;
  name: string;
  type: PartnerType;

  contact: {
    phone?: string;
    whatsapp?: string;
    email?: string;
  };

  serviceCategories?: string[];
  areaNames?: string[];

  notes?: string;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 6. REQUESTS (Catch-all demand)
// ============================================================================

export type RequestCategory =
  | 'TAXI'
  | 'HOUSING'
  | 'CAR_RENTAL'
  | 'WATER_GAS'
  | 'GROCERIES'
  | 'ACTIVITY'
  | 'OTHER';

export type RequestStatus = 'new' | 'in_progress' | 'resolved' | 'cancelled';

export interface Request {
  id: string;
  userId: string;
  cityId: string;

  category: RequestCategory;
  title: string;
  description: string;

  meta?: {
    // Time
    when?: 'now' | 'today' | 'this_weekend' | 'date_range';
    fromDate?: string;
    toDate?: string;

    // Location
    placeId?: string;
    lat?: number;
    lng?: number;
    areaName?: string;

    // Housing-specific
    beds?: number;
    intent?: 'rent' | 'buy';
    budgetMin?: number;
    budgetMax?: number;

    // Car-specific
    carType?: string;
    rentalDays?: number;

    // Generic
    quantity?: number;
    notes?: string;
  };

  status: RequestStatus;

  // Contact fallback
  contactPhone?: string;
  contactWhatsApp?: string;
  preferredContact?: 'whatsapp' | 'phone' | 'in_app';

  // Internal routing
  assignedPartnerId?: string;
  internalNotes?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 7. CONNECTIONS (People network)
// ============================================================================

export interface Connection {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
  source: 'wave' | 'housing_match' | 'tribe';
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
}

// ============================================================================
// 8. ANALYTICS & INTELLIGENCE
// ============================================================================

export type EventType =
  | 'USER_SIGNED_UP'
  | 'CHAT_MESSAGE'
  | 'REQUEST_CREATED'
  | 'JOB_STATUS_CHANGED'
  | 'MAP_PLACE_TAP'
  | 'PLACE_CHECK_IN'
  | 'LISTING_VIEWED'
  | 'VIEWING_REQUESTED';

export interface Event {
  id: string;
  cityId: string;
  userId?: string;
  type: EventType;

  objectType?: 'request' | 'place' | 'listing' | 'activity';
  objectId?: string;

  metadata?: Record<string, any>;
  createdAt: string;
}
