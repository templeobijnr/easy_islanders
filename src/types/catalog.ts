import { Timestamp } from 'firebase/firestore';
import { Region, PinActionConfig } from './connect';

export type CatalogType = 'stay' | 'activity' | 'event' | 'place' | 'experience';

export interface FirestoreBasePin {
  id: string;
  type: CatalogType;

  title: string;
  description?: string;
  category: string;

  // Region may come in as pretty label or lowercase code; normalize in mappers.
  region?: Region | string;
  cityId?: string;

  coordinates?: {
    lat: number;
    lng: number;
  };
  address?: string;

  images?: string[];
  actions?: PinActionConfig;

  contact?: {
    phone?: string;
    website?: string;
    email?: string;
  };

  price?: number;
  currency?: string;

  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// --- Rich Stay schema (nested) ---

export type StayPropertyType = 'villa' | 'apartment' | 'hotel' | 'bnb' | 'other' | string;

export interface StayBasic {
  title: string;
  subtitle?: string;
  description: string;
  propertyType: StayPropertyType;
  sizeSqm?: number;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  images: string[];
}

export interface StayLocation {
  geo?: {
    lat: number;
    lng: number;
  };
  addressLabel: string;
  city: string;
  region: string;
  country?: string;
  mapboxPlaceId?: string;
}

export interface StayRatePlan {
  id: string;
  name: string;
  description?: string;
  minNights?: number;
  maxNights?: number;
  includedGuests?: number;
  extraGuestFee?: { amount: number; currency: string };
  cancellationPolicyId?: string;
}

export interface StaySeasonalRule {
  id: string;
  label: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  priceMultiplier?: number;
  overrideNightly?: { amount: number; currency: string };
}

export interface StayPricing {
  baseNightly: { amount: number; currency: 'GBP' | 'EUR' | 'USD' | 'TRY' | string };
  ratePlans?: StayRatePlan[];
  seasonalRules?: StaySeasonalRule[];
  fees?: {
    cleaning?: number;
    serviceFee?: number;
    cityTax?: number;
    securityDeposit?: number;
    extraFeesNote?: string;
  };
  discount?: {
    percentage?: number;
    minNights?: number;
    notes?: string;
  };
}

export interface StayAvailabilityRules {
  bookingWindowDays?: number;
  sameDayCutoffHour?: number;
  allowedCheckInDays?: number[];
  allowedCheckOutDays?: number[];
  closedDates?: string[];
}

export interface StayAmenitiesPopular {
  pool?: boolean;
  freeWifi?: boolean;
  freeParking?: boolean;
  airportShuttle?: boolean;
  nonSmokingRooms?: boolean;
}

export interface StayAmenitiesCategories {
  kitchen?: string[];
  bathroom?: string[];
  bedroom?: string[];
  livingArea?: string[];
  mediaAndTech?: string[];
  outdoor?: string[];
  foodAndDrink?: string[];
  cleaning?: string[];
  accessibility?: string[];
  safetyAndSecurity?: string[];
  misc?: string[];
}

export interface StayAmenities {
  popular?: StayAmenitiesPopular;
  categories?: StayAmenitiesCategories;
}

export type StaySmokingPolicy = 'allowed' | 'not_allowed' | 'outside_only';
export type StayPetsPolicy = 'not_allowed' | 'allowed' | 'on_request';

export interface StayPolicies {
  checkIn?: { from: string; to?: string; notes?: string };
  checkOut?: { until: string; notes?: string };
  cancellationPolicy?: {
    freeCancellationUntilDays?: number;
    text?: string;
  };
  children?: { allowed: boolean; notes?: string };
  extraBeds?: string;
  smoking?: StaySmokingPolicy;
  pets?: StayPetsPolicy;
  partiesAllowed?: boolean;
  quietHours?: { from?: string; to?: string };
  payment?: {
    cashOnly?: boolean;
    acceptedCards?: string[];
    currenciesAccepted?: string[];
  };
  houseRulesText?: string;
}

export interface StayHost {
  name: string;
  phone?: string;
  email?: string;
  languages?: string[];
  bio?: string;
}

export interface StayAreaInfo {
  summary?: string;
  attractions?: string[];
  restaurants?: string[];
  beaches?: string[];
  airports?: string[];
}

export interface FirestoreStay extends FirestoreBasePin {
  type: 'stay';
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  billingPeriod?: 'night' | 'month' | 'year';
  amenities?: string[];
  discountPercent?: number;
  cleaningFee?: number;
  extraFeesNote?: string;
  hostName?: string;
  hostPhone?: string;
  hostEmail?: string;
  requestOnly?: boolean;

  // Rich, nested schema (optional).
  basic?: StayBasic;
  locationDetails?: StayLocation;
  pricingDetails?: StayPricing;
  availabilityRules?: StayAvailabilityRules;
  amenitiesStructured?: StayAmenities;
  policies?: StayPolicies;
  hostProfile?: StayHost;
  areaInfo?: StayAreaInfo;
}

export type PricingModel = 'fixed' | 'per_person' | 'per_unit' | 'tiered' | 'duration';

export interface PricingOption {
  id: string;
  label: string; // e.g., "Adult", "Child", "15 Minutes", "100 Paintballs"
  price: number;
  currency: string;
  description?: string; // e.g., "Includes safety gear"

  // For 'duration' model
  durationMinutes?: number;

  // For 'tiered' or 'per_unit'
  unit?: string; // e.g., "ball", "lap", "hour"
}

export interface ActivityPricing {
  model: PricingModel;
  currency: string; // Default currency for the activity
  basePrice?: number; // Optional base fee (e.g., entry fee)
  options: PricingOption[];
}

export interface FirestoreActivity extends FirestoreBasePin {
  type: 'activity';
  startTime?: Timestamp | Date;
  endTime?: Timestamp | Date;
  approved?: boolean;

  // New flexible pricing
  pricing?: ActivityPricing;
}

export interface FirestoreEvent extends FirestoreBasePin {
  type: 'event';
  startTime: Timestamp | Date;
  endTime?: Timestamp | Date;
  isPublic?: boolean;
  approved?: boolean;
}

export interface FirestorePlace extends FirestoreBasePin {
  type: 'place';

  // Subcategory for more specific classification
  subcategory?: string; // e.g., 'sushi', 'italian', 'thai' for restaurants

  // Contact info
  phone?: string;
  website?: string;

  // Google-sourced rich data
  rating?: number;
  reviewCount?: number;
  priceLevel?: number; // 1-4 scale from Google (1=Cheap, 4=Expensive)
  openingHours?: string[]; // Weekday text from Google

  // Cuisine/Type tags (for restaurants/cafes)
  cuisineTypes?: string[]; // e.g., ['seafood', 'mediterranean', 'turkish']

  // Amenities/Features
  amenities?: string[]; // e.g., ['wifi', 'parking', 'outdoor_seating', 'delivery']

  // Actionable features (what users can do from this pin)
  actions?: {
    call?: boolean;      // Show call button
    navigate?: boolean;  // Show directions button
    book?: boolean;      // Show booking button
    menu?: boolean;      // Show menu button
    order?: boolean;     // Show order button
    checkIn?: boolean;   // Show check-in button
    wave?: boolean;      // Show "wave" social feature
  };

  // Is place currently open (can be updated periodically)
  isOpenNow?: boolean;
}

export interface FirestoreExperience extends FirestoreBasePin {
  type: 'experience';
  duration?: string;
  included?: string[];
  requirements?: string[];
  // Google-sourced rich data
  rating?: number;
  reviewCount?: number;
}
