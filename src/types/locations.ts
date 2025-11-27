/**
 * Location and geography types for the island.
 *
 * These are used by:
 *  - map components (Mapbox, island map, Connect)
 *  - backend tools that reason about areas / routes
 *  - Typesense search helpers for location‑aware queries
 */

/** Geographic coordinates. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Bounding box for a geographic area. */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** A concrete place with a name, address and coordinates. */
export interface Place {
  id?: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  placeId?: string; // Google Places ID
  category?: PlaceCategory;
  types?: string[]; // Google Places types
}

/** High‑level category of a place (used in maps and search). */
export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'beach'
  | 'landmark'
  | 'shopping'
  | 'nightlife'
  | 'attraction'
  | 'service'
  | 'transport'
  | 'other';

/** Named area or region (city, district, neighbourhood, etc.). */
export interface Area {
  id: string;
  name: string;
  type: AreaType;
  coordinates?: Coordinates; // Center point
  bounds?: BoundingBox;
  parent?: string; // Parent area ID
  description?: string;
}

/** Type of area in the hierarchy. */
export type AreaType =
  | 'country'
  | 'city'
  | 'district'
  | 'neighborhood'
  | 'landmark'
  | 'custom';

/** Cyprus‑specific area constants used across the UI. */
export const CyprusAreas = {
  KYRENIA: 'Kyrenia',
  NICOSIA: 'Nicosia',
  FAMAGUSTA: 'Famagusta',
  ISKELE: 'Iskele',
  LAPTA: 'Lapta',
  BELLAPAIS: 'Bellapais',
  ALSANCAK: 'Alsancak',
  CATALKOY: 'Çatalköy',
} as const;

export type CyprusArea = typeof CyprusAreas[keyof typeof CyprusAreas];

/** Full location context around a primary place. */
export interface LocationContext {
  current: Place;
  nearby?: Place[];
  area?: Area;
  country?: string;
}

/** Distance / duration information for a route. */
export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  distanceText: string; // "5.2 km"
  durationText: string; // "12 mins"
  polyline?: string; // Encoded polyline
}

/** Snapshot of a user's current (or last known) location. */
export interface UserLocation {
  userId: string;
  coordinates: Coordinates;
  accuracy?: number; // meters
  address?: string;
  placeId?: string;
  timestamp: string;
  isApproximate?: boolean;
}

/** Result from a geocoding operation (text → coordinates). */
export interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
  confidence: number; // 0-1
  components?: {
    street?: string;
    city?: string;
    district?: string;
    country?: string;
    postalCode?: string;
  };
}
