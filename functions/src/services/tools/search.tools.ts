/**
 * Search & Discovery Tools
 *
 * Handles marketplace search, local places, events, and content discovery.
 */

import * as logger from "firebase-functions/logger";
import type {
  SearchListingsArgs,
  SearchLocalPlacesArgs,
  SearchEventsArgs,
} from "../../types/tools";

export const searchTools = {
  /**
   * Search marketplace listings using TypeSense
   */
  searchMarketplace: async (args: SearchListingsArgs): Promise<any> => {
    logger.debug("🔍 [Search] TypeSense Search Args:", args);

    try {
      const { searchListings } = await import("../typesense.service");
      const result = await searchListings({
        query: args.query || "*",
        domain: args.domain,
        category: args.category,
        subCategory: args.subCategory,
        location: args.location,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        perPage: 20,
      });

      logger.debug(`🔍 [Search] Found ${result.found} items via TypeSense`);

      return result.hits.map((hit: any) => ({
        id: hit.id,
        title: hit.title,
        price: hit.price,
        location: hit.location,
        domain: hit.domain,
        category: hit.category,
        subCategory: hit.subCategory,
        description: hit.description,
        imageUrl: hit.metadata?.imageUrl,
        amenities: hit.metadata?.amenities,
        rating: hit.metadata?.rating,
      }));
    } catch (error: any) {
      console.error("🔴 [Search] TypeSense Failed:", error);
      return [];
    }
  },

  /**
   * Search for local places using Mapbox
   */
  searchLocalPlaces: async (args: SearchLocalPlacesArgs): Promise<any> => {
    logger.debug("🔍 [Search] Local Places (Mapbox):", args);

    try {
      const { searchMapboxPlaces } = await import("../mapbox.service");

      // Construct a query that includes location for better accuracy
      const query = args.location
        ? `${args.query || args.domain || ""} in ${args.location}`
        : args.query || args.domain || "places";

      const places = await searchMapboxPlaces(query, {
        types: "poi",
        limit: 10,
      });

      logger.debug(`🔍 [Search Local] Found ${places.length} items via Mapbox`);

      return places.map((place: any) => ({
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
    } catch (error: any) {
      console.error("🔴 [Search Local] Failed:", error);
      return [];
    }
  },

  /**
   * Search for events
   */
  searchEvents: async (args: SearchEventsArgs): Promise<any> => {
    logger.debug("🔍 [Search] Events:", args);

    try {
      const { searchListings } = await import("../typesense.service");
      const result = await searchListings({
        query: args.query || "*",
        domain: "Events",
        location: args.location,
        perPage: 20,
      });

      logger.debug(`🔍 [Search Events] Found ${result.found} events`);

      return result.hits.map((hit: any) => ({
        id: hit.id,
        title: hit.title,
        price: hit.price,
        location: hit.location,
        description: hit.description,
        imageUrl: hit.metadata?.imageUrl,
        startsAt: hit.metadata?.startsAt,
        endsAt: hit.metadata?.endsAt,
      }));
    } catch (error: any) {
      console.error("🔴 [Search Events] Failed:", error);
      return [];
    }
  },

  /**
   * Search specifically for housing
   */
  searchHousingListings: async (args: any, ctx: any): Promise<any> => {
    logger.debug("🏠 [Search] Housing:", args);
    const { searchListings } = await import("../typesense.service");

    // Map args to searchListings params
    return searchListings({
      query: "*", // Default to all if no specific query
      domain: "Real Estate", // or 'housing' depending on your index
      category: "housing",
      location: args.areaName, // Map areaName to location
      minPrice: args.budgetMin,
      maxPrice: args.budgetMax,
      bedrooms: args.bedrooms,
      perPage: 10,
    });
  },

  /**
   * Search curated places
   */
  searchPlaces: async (args: any, ctx: any): Promise<any> => {
    logger.debug("📍 [Search] Curated Places:", args);
    // Try Typesense first for curated places
    try {
      const { searchListings } = await import("../typesense.service");
      const result = await searchListings({
        query: args.tag || "*",
        domain: "Places",
        category: args.category,
        perPage: args.limit || 10,
      });

      if (result.found > 0) {
        return result.hits;
      }
    } catch (e) {
      console.warn("TypeSense place search failed, falling back to Mapbox", e);
    }

    // Fallback to Mapbox if no curated places found
    const { searchMapboxPlaces } = await import("../mapbox.service");
    const query = `${args.category || ""} ${args.tag || ""}`;
    return searchMapboxPlaces(query, {
      types: "poi",
      limit: args.limit || 10,
    });
  },
};
