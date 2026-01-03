/**
 * Search & Discovery Tools
 *
 * Handles marketplace search, local places, events, and content discovery.
 */

import * as logger from "firebase-functions/logger";
import { db } from "../../config/firebase";
import type {
  SearchListingsArgs,
  SearchLocalPlacesArgs,
  SearchEventsArgs,
} from "../../types/tools";

// ─────────────────────────────────────────────────────────────────────────────
// Typed Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface MapboxPlace {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties: {
    category?: string;
    address?: string;
  };
}

interface SearchHousingArgs {
  areaName?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
}

interface SearchPlacesArgs {
  tag?: string;
  category?: string;
  limit?: number;
}

interface SearchContext {
  marketId?: string;
}

interface SearchStaysArgs {
  location?: string;
  type?: string; // 'villa', 'apartment', 'daily', 'long-term'
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  limit?: number;
}

interface SearchResult {
  id: string;
  title: string;
  price?: number;
  location?: string;
  domain?: string;
  category?: string;
  subCategory?: string;
  description?: string;
  imageUrl?: string | null;
  amenities?: string[];
  rating?: number;
}[]

// ─────────────────────────────────────────────────────────────────────────────
// Search Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const searchTools = {
  /**
   * Search marketplace listings using Firestore directly
   * For: Cars (rentals), Properties for SALE
   * NOT for: Stay rentals (use searchStays instead)
   */
  searchMarketplace: async (args: SearchListingsArgs): Promise<any> => {
    const startTime = Date.now();
    logger.info("🔍 [SearchMarketplace] Query:", { args, timestamp: new Date().toISOString() });

    try {
      // Build Firestore query based on domain
      let query = db.collection("listings").limit(args.limit || 20);

      // Map domain to listing type
      if (args.domain === "Cars" || args.domain?.toLowerCase().includes("car")) {
        query = query.where("type", "==", "car");
      } else if (args.domain === "Real Estate" || args.domain?.toLowerCase().includes("sale")) {
        // Only properties for SALE, not rentals
        query = query.where("type", "==", "property");
        // If no subCategory, assume sale (since rentals should use searchStays)
        if (!args.subCategory || args.subCategory === "sale") {
          query = query.where("subCategory", "==", "sale");
        }
      }

      const snapshot = await query.get();

      // In-memory filtering for additional criteria
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          price: data.price,
          currency: data.currency,
          location: data.region || data.location,
          domain: args.domain,
          category: data.category,
          subCategory: data.subCategory,
          description: data.description,
          imageUrl: data.images?.[0] || data.imageUrl,
          amenities: data.amenities,
          rating: data.rating,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
        };
      });

      // Apply filters in memory
      if (args.location) {
        results = results.filter(r =>
          r.location?.toLowerCase().includes(args.location!.toLowerCase())
        );
      }
      if (args.minPrice) {
        results = results.filter(r => r.price >= args.minPrice!);
      }
      if (args.maxPrice) {
        results = results.filter(r => r.price <= args.maxPrice!);
      }

      logger.info(`✅ [SearchMarketplace] Complete`, {
        queryArgs: args,
        resultsCount: results.length,
        durationMs: Date.now() - startTime,
      });

      return results;
    } catch (error: unknown) {
      logger.error("❌ [SearchMarketplace] Failed:", error);
      return [];
    }
  },


  /**
   * Search for local places using Mapbox
   */
  searchLocalPlaces: async (args: SearchLocalPlacesArgs): Promise<any> => {
    logger.debug("🔍 [Search] Local Places (Mapbox):", args);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { searchMapboxPlaces } = require("../mapbox.service");

      // Construct a query that includes location for better accuracy
      const query = args.location
        ? `${args.query || args.domain || ""} in ${args.location}`
        : args.query || args.domain || "places";

      const places = await searchMapboxPlaces(query, {
        types: "poi",
        limit: 10,
      });

      logger.debug(`🔍 [Search Local] Found ${places.length} items via Mapbox`);

      return places.map((place: MapboxPlace) => ({
        id: place.id,
        title: place.text,
        price: 0, // Mapbox doesn't provide price
        location: place.place_name,
        amenities: place.properties.category ? [place.properties.category] : [],
        description: place.properties.address || place.place_name,
        imageUrl: null, // Mapbox doesn't provide images directly
        domain: args.domain,
        category: place.properties.category || "Place",
        subCategory: "Mapbox POI",
        type: "venue",
        coordinates: {
          lat: place.center[1],
          lng: place.center[0],
        },
      }));
    } catch (error: unknown) {
      console.error("🔴 [Search Local] Failed:", error);
      return [];
    }
  },

  /**
   * Search for events
   */
  searchEvents: async (args: SearchEventsArgs): Promise<any> => {
    logger.debug("🔍 [Search] Events:", args);

    // Use Firestore directly (Typesense temporarily disabled)
    try {
      let query = db.collection("listings")
        .where("domain", "==", "Events")
        .limit(20);

      const snapshot = await query.get();

      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || "Untitled",
          price: data.price || 0,
          location: data.region || data.location || data.address,
          description: data.description,
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : data.imageUrl,
          startsAt: data.startsAt || data.startTime,
          endsAt: data.endsAt || data.endTime,
        };
      });

      // Apply in-memory filters
      if (args.location) {
        const loc = args.location.toLowerCase();
        results = results.filter((r: any) =>
          (r.location || "").toLowerCase().includes(loc)
        );
      }
      if (args.query) {
        const q = args.query.toLowerCase();
        results = results.filter((r: any) =>
          (r.title || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
        );
      }

      logger.info(`✅ [Search Events] Firestore returned ${results.length} events`);
      return results;
    } catch (error: unknown) {
      logger.error("🔴 [Search Events] Firestore query failed:", error);
      return [];
    }
  },

  /**
   * Search specifically for housing
   */
  searchHousingListings: async (args: SearchHousingArgs, _ctx: SearchContext): Promise<unknown> => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tools.ts:249',message:'searchHousingListings ENTRY',data:{args,hasTypesenseCall:false,implementation:'Firestore-direct'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    logger.debug("🏠 [Search] Housing:", args);

    // Use Firestore directly (Typesense temporarily disabled)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tools.ts:253',message:'BEFORE Firestore query',data:{aboutToQuery:'listings collection'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      let query = db.collection("listings")
        .where("domain", "==", "Real Estate")
        .where("category", "==", "housing")
        .limit(10);

      const snapshot = await query.get();

      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || "Untitled",
          price: data.displayPrice || data.price,
          location: data.region || data.address || data.location?.label,
          domain: "Real Estate",
          category: "housing",
          subCategory: data.subcategory,
          description: data.description,
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null,
          amenities: data.amenities || [],
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
        };
      });

      // Apply in-memory filters
      if (args.areaName) {
        const area = args.areaName.toLowerCase();
        results = results.filter((r: any) =>
          (r.location || "").toLowerCase().includes(area) ||
          (r.title || "").toLowerCase().includes(area)
        );
      }
      if (args.budgetMin) {
        results = results.filter((r: any) => (r.price || 0) >= args.budgetMin!);
      }
      if (args.budgetMax) {
        results = results.filter((r: any) => (r.price || Infinity) <= args.budgetMax!);
      }
      if (args.bedrooms) {
        results = results.filter((r: any) => (r.bedrooms || 0) >= args.bedrooms!);
      }

      logger.info("✅ [SearchHousing] Firestore fallback returned", { count: results.length });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/7207ff65-c9c6-4873-a824-51b8bedf5d3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tools.ts:297',message:'searchHousingListings EXIT SUCCESS',data:{resultCount:results.length,usedFirestore:true,usedTypesense:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return results;
    } catch (firestoreError: any) {
      logger.error("🔴 [SearchHousing] Firestore fallback also failed:", firestoreError.message);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Search curated places
   */
  searchPlaces: async (args: SearchPlacesArgs, _ctx: SearchContext): Promise<unknown> => {
    logger.debug("📍 [Search] Curated Places:", args);
    // Use Mapbox directly (Typesense temporarily disabled)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchMapboxPlaces } = require("../mapbox.service");
    const query = `${args.category || ""} ${args.tag || ""}`.trim();
    return searchMapboxPlaces(query, {
      types: "poi",
      limit: args.limit || 10,
    });
  },

  /**
   * Search stays/rentals directly from Firestore
   * Supports daily rentals, villas, apartments
   * Uses direct Firestore query for reliability (no Typesense sync needed)
   */
  searchStays: async (args: SearchStaysArgs, _ctx?: SearchContext): Promise<unknown[]> => {
    const startTime = Date.now();
    logger.info("🏠 [SearchStays] Query:", { args, timestamp: new Date().toISOString() });

    try {
      // Query listings with type = 'stay' (matches UnifiedListing.type)
      const query = db.collection("listings")
        .where("type", "==", "stay")
        .limit(args.limit || 20);

      const snapshot = await query.get();

      // Filter in memory for additional criteria
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || "Untitled",
          price: data.displayPrice || data.price,
          location: data.region || data.address || (data.location?.label),
          domain: "Stays",
          category: data.category,
          subCategory: data.subcategory || data.category,
          description: data.description,
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null,
          amenities: data.amenities || [],
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          rating: data.rating,
        };
      });

      // Apply filters
      if (args.location) {
        const loc = args.location.toLowerCase();
        results = results.filter((r: any) =>
          (r.location || "").toLowerCase().includes(loc)
        );
      }

      if (args.type) {
        const t = args.type.toLowerCase();
        results = results.filter((r: any) =>
          (r.category || "").toLowerCase().includes(t) ||
          (r.subCategory || "").toLowerCase().includes(t)
        );
      }

      if (args.minPrice) {
        results = results.filter((r: any) => (r.price || 0) >= args.minPrice!);
      }
      if (args.maxPrice) {
        results = results.filter((r: any) => (r.price || Infinity) <= args.maxPrice!);
      }
      if (args.bedrooms) {
        results = results.filter((r: any) => (r.bedrooms || 0) >= args.bedrooms!);
      }

      // Audit log
      const durationMs = Date.now() - startTime;
      logger.info("✅ [SearchStays] Complete", {
        queryArgs: args,
        resultsCount: results.length,
        durationMs,
        timestamp: new Date().toISOString(),
      });

      return results;
    } catch (error) {
      logger.error("🔴 [SearchStays] Failed:", error);
      return [];
    }
  },
};
