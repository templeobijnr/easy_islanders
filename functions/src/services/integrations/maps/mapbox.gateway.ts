/**
 * Mapbox Gateway
 *
 * Pure HTTP gateway for Mapbox Geocoding API.
 * No LLM, no business logic. Just HTTP, parsing, and error handling.
 */

import * as logger from "firebase-functions/logger";
import axios from "axios";

const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN;
const BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export interface MapboxPlace {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties: {
    category?: string;
    address?: string;
    [key: string]: any;
  };
  context?: any[];
}

export const searchMapboxPlaces = async (
  query: string,
  options: {
    limit?: number;
    types?: string; // 'poi', 'address', etc.
    proximity?: string; // 'lng,lat'
    bbox?: string; // 'minLng,minLat,maxLng,maxLat'
  } = {},
): Promise<MapboxPlace[]> => {
  if (!MAPBOX_TOKEN) {
    console.error("🔴 [Mapbox] Missing VITE_MAPBOX_TOKEN");
    return [];
  }

  try {
    // Default to Cyprus bounding box if not specified to keep results relevant
    // Approx Cyprus BBox: 32.2,34.5,34.6,35.7
    const defaultBBox = "32.2,34.5,34.6,35.7";

    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: (options.limit || 10).toString(),
      country: "cy,tr", // Prioritize Cyprus and Turkey (North Cyprus often falls under TR in some datasets or just generic)
      bbox: options.bbox || defaultBBox,
    });

    if (options.types) params.append("types", options.types);
    if (options.proximity) params.append("proximity", options.proximity);

    const url = `${BASE_URL}/${encodeURIComponent(query)}.json?${params.toString()}`;
    logger.debug(`🌍 [Mapbox] Fetching: ${url}`);

    const response = await axios.get(url);

    if (!response.data || !response.data.features) {
      return [];
    }

    return response.data.features.map((f: any) => ({
      id: f.id,
      text: f.text,
      place_name: f.place_name,
      center: f.center,
      properties: f.properties || {},
      context: f.context,
    }));
  } catch (error) {
    console.error("🔴 [Mapbox] API Error:", error);
    return [];
  }
};
