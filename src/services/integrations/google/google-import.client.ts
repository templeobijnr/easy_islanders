/**
 * Integration Service: Google Places Import
 *
 * Responsibility:
 * - Fetch place details from Google Places API (via proxy)
 * - Import and upload images to Firebase Storage
 * - Map Google Place data to FirestoreActivity format
 *
 * External Dependencies:
 * - Google Places API (via backend proxy)
 * - Firebase Storage
 *
 * Firestore Collections:
 * - None (writes to Firebase Storage only)
 *
 * Layer: Integration Service
 *
 * Dependencies:
 * - firebaseConfig (for storage)
 *
 * Notes:
 * - Uses backend proxy to protect API key
 * - Comprehensive category mapping from Google types
 * - Safe to modify in isolation
 *
 * Stability: Core
 */

import { logger } from "@/utils/logger";
import * as storageLib from "firebase/storage";
import { storage } from "../../firebaseConfig";
import { FirestoreActivity } from "../../../types/catalog";

const PROXY_URL =
  import.meta.env.VITE_PLACES_PROXY_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") +
    "/googlePlacesProxy"
    : "");

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string }>;
  opening_hours?: { weekday_text: string[] };
  types?: string[];
  price_level?: number;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

// Comprehensive mapping of Google Place types to Easy Islanders categories
// Priority: First match wins, so order matters
const CATEGORY_MAPPING: Record<string, string> = {
  // 🍽️ Food & Drink
  restaurant: "restaurants",
  food: "restaurants",
  meal_delivery: "restaurants",
  meal_takeaway: "restaurants",

  // ☕ Cafes
  cafe: "cafes",
  bakery: "cafes",

  // 🍺 Bars
  bar: "bars",

  // 🏨 Hotels & Stays
  lodging: "hotels_stays",
  hotel: "hotels_stays",
  resort: "hotels_stays",
  motel: "hotels_stays",
  guest_house: "guest_houses",
  hostel: "guest_houses",

  // 💆 Spas & Wellness
  spa: "spas_wellness",
  health: "spas_wellness",

  // 💪 Gyms & Fitness
  gym: "gyms_fitness",

  // 🏛️ Museums & Culture
  museum: "museums_culture",
  art_gallery: "museums_culture",
  place_of_worship: "museums_culture",

  // 🍸 Nightlife
  night_club: "nightlife",

  // 🎬 Cinemas & Theaters
  movie_theater: "cinemas_theaters",

  // 🎳 Bowling & Indoor Recreation
  bowling_alley: "bowling_recreation",
  amusement_park: "bowling_recreation",

  // 🌿 Parks & Nature
  park: "parks_nature",
  natural_feature: "parks_nature",
  campground: "parks_nature",

  // 🏖️ Beaches (fallback - usually natural_feature + keyword)
  // No direct Google type, handled by keyword fallback

  // 🏛️ Tourist Attractions & Landmarks
  tourist_attraction: "attractions",
  point_of_interest: "attractions",

  // 🛍️ Shopping
  shopping_mall: "shopping",
  clothing_store: "shopping",
  supermarket: "shopping",
  store: "shopping",
  jewelry_store: "shopping",
  shoe_store: "shopping",
  electronics_store: "shopping",
  home_goods_store: "shopping",
  furniture_store: "shopping",

  // 💇 Beauty & Salons
  beauty_salon: "beauty_salons",
  hair_care: "beauty_salons",

  // 💊 Pharmacies & Medical
  pharmacy: "pharmacies_medical",
  doctor: "pharmacies_medical",
  hospital: "pharmacies_medical",
  dentist: "pharmacies_medical",

  // 🏦 Banks & Finance
  bank: "banks_finance",
  atm: "banks_finance",
  finance: "banks_finance",

  // 🚗 Car Rentals (limited support - may need keyword fallback)
  car_rental: "car_rentals",
  car_dealer: "car_rentals",

  // 🚉 Transport Hubs
  transit_station: "transport",
  bus_station: "transport",
  airport: "transport",
  train_station: "transport",
  subway_station: "transport",

  // ⛽ EV Charging & Gas Stations
  gas_station: "gas_ev_charging",
  // 'charging_station' is not always available

  // 🎓 Education
  school: "education",
  university: "education",
  library: "education",

  // 🏢 Generic establishments (lowest priority)
  establishment: "services",
};

// Keywords to detect categories when Google types don't match
export const KEYWORD_FALLBACKS: Record<string, string[]> = {
  beaches: ["beach", "seaside", "coast", "shore"],
  water_activities: [
    "boat",
    "diving",
    "water sport",
    "kayak",
    "surf",
    "yacht",
    "sailing",
    "jet ski",
    "parasailing",
    "snorkel",
  ],
  car_rentals: ["car rental", "vehicle rental", "rent a car"],
  spas_wellness: [
    "spa",
    "massage",
    "wellness",
    "relax",
    "hammam",
    "sauna",
    "steam",
  ],
  gyms_fitness: ["gym", "fitness", "workout", "crossfit", "pilates", "weight"],
  adventure_sports: [
    "paragliding",
    "zipline",
    "bungee",
    "skydiving",
    "rock climbing",
    "rappelling",
  ],
  motor_activities: ["karting", "go-kart", "quad", "atv", "buggy", "motocross"],
  shooting_sports: [
    "paintball",
    "archery",
    "shooting range",
    "laser tag",
    "airsoft",
  ],
  golf_tennis: ["golf", "tennis", "court", "driving range"],
  horse_riding: ["horse", "riding", "equestrian", "stable", "pony"],
  yoga_meditation: ["yoga", "meditation", "mindfulness", "retreat"],
  escape_rooms: ["escape room", "puzzle", "mystery room", "escape game"],
  amusement_parks: [
    "amusement",
    "theme park",
    "water park",
    "fun park",
    "luna park",
  ],
  outdoor_activities: [
    "hiking",
    "trekking",
    "trail",
    "nature walk",
    "camping",
    "cycling tour",
  ],
  beach_clubs: ["beach club", "beach bar", "sunbed", "cabana"],
};

export const GoogleImportService = {
  /**
   * Fetch rich details for a place from the backend proxy
   */
  getPlaceDetails: async (
    placeId: string,
  ): Promise<GooglePlaceResult | null> => {
    try {
      const res = await fetch(
        `${PROXY_URL}?action=details&place_id=${placeId}`,
      );
      const data = await res.json();
      return data.result || null;
    } catch (err) {
      console.error("Failed to fetch place details:", err);
      return null;
    }
  },

  /**
   * Import images from Google Photos
   * 1. Fetch image blob via proxy
   * 2. Upload to Firebase Storage
   * 3. Return permanent Firebase URL
   */
  importImages: async (
    photos: Array<{ photo_reference: string }>,
    placeId: string,
    limit: number = 5,
  ): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const photosToImport = photos.slice(0, limit);

    logger.debug(
      `[GoogleImportService] Starting import of ${photosToImport.length} photos for place ${placeId}`,
    );

    for (let i = 0; i < photosToImport.length; i++) {
      const photoRef = photosToImport[i].photo_reference;
      try {
        // 1. Fetch Blob from Proxy
        const proxyUrl = `${PROXY_URL}?action=photo&photo_reference=${photoRef}&maxwidth=800`;
        logger.debug(
          `[GoogleImportService] Fetching photo ${i + 1}/${photosToImport.length}`,
        );
        const res = await fetch(proxyUrl);
        if (!res.ok)
          throw new Error(`Failed to fetch photo from proxy: ${res.status}`);
        const blob = await res.blob();

        // 2. Upload to Firebase Storage
        const storagePath = `places_import/${placeId}/photo_${i}_${Date.now()}.jpg`;
        const storageRef = storageLib.ref(storage, storagePath);

        logger.debug(
          `[GoogleImportService] Uploading photo ${i + 1} to Firebase Storage`,
        );
        await storageLib.uploadBytes(storageRef, blob);
        const downloadUrl = await storageLib.getDownloadURL(storageRef);

        uploadedUrls.push(downloadUrl);
        logger.debug(
          `[GoogleImportService] Photo ${i + 1} uploaded successfully`,
        );
      } catch (err) {
        console.error(
          `[GoogleImportService] Failed to import photo ${i}:`,
          err,
        );
      }
    }
    logger.debug(
      `[GoogleImportService] Import complete. ${uploadedUrls.length}/${photosToImport.length} photos uploaded.`,
    );
    return uploadedUrls;
  },

  /**
   * Map Google Place result to FirestoreActivity partial
   */
  mapToActivity: (place: GooglePlaceResult): Partial<FirestoreActivity> => {
    // 1. Map Category
    let category = "day_trip"; // Default
    if (place.types) {
      for (const type of place.types) {
        if (CATEGORY_MAPPING[type]) {
          category = CATEGORY_MAPPING[type];
          break;
        }
      }
    }

    // 2. Generate Description from Reviews (Simple aggregation)
    let description = "";
    if (place.reviews && place.reviews.length > 0) {
      const topReviews = place.reviews
        .slice(0, 3)
        .map((r) => `"${r.text}"`)
        .join("\n\n");
      description = `Rated ${place.rating} stars on Google.\n\nRecent Reviews:\n${topReviews}`;
    }

    // 3. Map Price Level (1-4) to approximate price
    // This is tricky as 'price' in Activity is a number. We might just leave it empty or set a default.
    // For now, we won't set 'price' but we could set a 'priceLevel' tag if we had one.

    return {
      title: place.name,
      address: place.formatted_address,
      category: category,
      description: description,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      contact: {
        phone: place.international_phone_number,
        website: place.website,
        email: "", // Google doesn't provide email
      },
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
    };
  },
};
