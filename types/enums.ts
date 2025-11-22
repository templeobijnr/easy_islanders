
export type MarketplaceDomain = 
  | 'Real Estate' 
  | 'Marketplace' 
  | 'Cars' 
  | 'Events' 
  | 'Services' 
  | 'Restaurants' 
  | 'Health & Beauty'
  | 'Hotels';

export type RealEstateType = 'short-term' | 'long-term' | 'sale' | 'project';
export type VehicleType = 'rental' | 'sale' | 'taxi';
export type HotelType = 'Boutique' | 'Resort & Casino' | 'City Hotel' | 'Bungalow' | 'Historic';
export type RestaurantType = 'Meyhane' | 'Seafood' | 'Bistro' | 'Fine Dining' | 'Cafe';
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

export type ListingStatus = 'active' | 'draft' | 'archived' | 'under_offer' | 'sold' | 'rented';

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}
