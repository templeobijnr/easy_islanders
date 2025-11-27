
/**
 * High‑level supply domains that the marketplace and agent
 * can operate on. These map directly to Firestore listings
 * and Typesense `domain` values.
 */
export type MarketplaceDomain =
  | 'Real Estate'
  | 'Marketplace'
  | 'Cars'
  | 'Events'
  | 'Services'
  | 'Restaurants'
  | 'Health & Beauty'
  | 'Hotels';

/** Sub‑types for real estate listings. */
export type RealEstateType = 'short-term' | 'long-term' | 'sale' | 'project';

/** Sub‑types for vehicles. */
export type VehicleType = 'rental' | 'sale' | 'taxi';

/** Hotel classification used in the Hotels dashboard + search. */
export type HotelType = 'Boutique' | 'Resort & Casino' | 'City Hotel' | 'Bungalow' | 'Historic';

/** Restaurant styles for filtering and discovery. */
export type RestaurantType = 'Meyhane' | 'Seafood' | 'Bistro' | 'Fine Dining' | 'Cafe';

/** Event categories for the Vibe / Events layer. */
export type EventType = 'Party' | 'Concert' | 'Cultural' | 'Networking' | 'Festival';

// Expanded Service Types
export type ServiceType =
  | 'Plumbing'
  | 'Electrician'
  | 'Gardening'
  | 'Home Maintenance'
  | 'Renovation'
  | 'Cleaning'
  | 'Vehicle Services'
  | 'Repair'
  | 'Weddings & Events'
  | 'Elderly & Baby Care'
  | 'Pet Services'
  | 'Security'
  | 'Construction'
  | 'Digital Services'
  | 'Textile & Handicrafts'
  | 'Architecture & Consulting'
  | 'Health'
  | 'Legal'
  | 'Beauty';

/**
 * Lifecycle state of a listing in the business dashboard.
 * This is used both for filtering and to control what
 * appears in Explore / search.
 */
export type ListingStatus = 'active' | 'draft' | 'archived' | 'under_offer' | 'sold' | 'rented';

/** Generic async loading state for frontend components. */
export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}
