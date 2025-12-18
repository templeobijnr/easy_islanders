export interface Venue {
  id: string;
  title: string;
  category: string;
  region: string;
  images: string[];
  type: string;
  lat?: number;
  lng?: number;
}

export interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;
  context?: Array<{ id: string; text: string }>;
}

export type CurationMode = "quick" | "create";
export type LocationMode = "venue" | "search" | "manual";
