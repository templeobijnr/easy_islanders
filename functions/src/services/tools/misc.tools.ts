import * as logger from "firebase-functions/logger";
import { db } from "../../config/firebase";
import { getErrorMessage } from '../../utils/errors';

import type {
  CreateConsumerRequestArgs,
  GetRealTimeInfoArgs,
} from "../../types/tools";
import { placesRepository } from "../../repositories/places.repository";
import { searchMapboxPlaces } from "../mapbox.service";
import { UserIdOrToolContext, asToolContext, ToolContext } from "./toolContext";
import type { PlaceCategory } from "../../types/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Typed Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface GetNearbyPlacesArgs {
  location?: string;
  domain?: string;
  radiusKm?: number;
  limit?: number;
}

interface OrderHouseholdSuppliesArgs {
  contactPhone?: string;
  customerName?: string;
  items?: string[];
  deliveryAddress?: string;
}

interface RequestServiceArgs {
  serviceType?: string;
  description?: string;
  urgency?: 'low' | 'medium' | 'high';
}

interface ComputeDistanceArgs {
  from: string;
  to: string;
}

interface FetchHotspotsArgs {
  area?: string;
  limit?: number;
}

interface AreaInfoArgs {
  area: string;
}

interface UserData {
  phone?: string;
  email?: string;
  displayName?: string;
}

interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

function parseLatLng(
  str: string | undefined,
): { lat: number; lng: number } | null {
  if (!str) return null;
  const parts = str.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return { lat: parts[0], lng: parts[1] };
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
}

function normalizePlaceCategory(domain?: string): PlaceCategory | null {
  const d = (domain || "").toLowerCase().trim();
  const direct = d as PlaceCategory;
  const allowed: PlaceCategory[] = [
    "food",
    "nightlife",
    "sight",
    "cafe",
    "co_working",
    "shopping",
    "service",
    "housing_project",
    "other",
  ];
  if (allowed.includes(direct)) return direct;
  if (d.includes("restaurant") || d.includes("food")) return "food";
  if (d.includes("bar") || d.includes("club") || d.includes("night"))
    return "nightlife";
  if (d.includes("cafe") || d.includes("coffee")) return "cafe";
  if (d.includes("shop") || d.includes("mall")) return "shopping";
  if (
    d.includes("service") ||
    d.includes("plumber") ||
    d.includes("electric") ||
    d.includes("handyman")
  )
    return "service";
  if (
    d.includes("sight") ||
    d.includes("museum") ||
    d.includes("beach") ||
    d.includes("hike")
  )
    return "sight";
  return null;
}

export const miscTools = {
  /**
   * Create a consumer request for goods/services
   */
  createConsumerRequest: async (
    args: CreateConsumerRequestArgs,
  ): Promise<ToolResult> => {
    logger.debug("📝 [ConsumerRequest] Creating request:", args);
    // Back-compat with the Gemini tool schema (`requestDetails`, `contactInfo`)
    const requestDetails =
      (args as any).requestDetails || (args as any).content;
    const contactInfo = (args as any).contactInfo || (args as any).domain;
    return {
      success: true,
      requestId: `REQ-${Date.now()}`,
      requestDetails: requestDetails || null,
      contactInfo: contactInfo || null,
    };
  },

  /**
   * Get real-time information (weather, exchange rates, etc.)
   */
  getRealTimeInfo: async (args: GetRealTimeInfoArgs): Promise<ToolResult> => {
    logger.debug("ℹ️ [RealTimeInfo] Getting info for:", args.category);
    return {
      success: true,
      info: `Current info for ${args.category}: Weather is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`,
    };
  },

  /**
   * Consult the knowledge base encyclopedia
   */
  consultEncyclopedia: async (args: {
    topic?: string;
    query?: string;
  }): Promise<ToolResult> => {
    const topic = args.topic || args.query || "";
    logger.debug("📚 [Encyclopedia] Looking up:", topic);
    return {
      success: true,
      content: `Knowledge lookup for "${topic}" is not yet connected to a live data source.`,
    };
  },

  /**
   * Find nearby places using (1) shared GPS (if available) or (2) Mapbox geocoding,
   * then filter the curated Firestore `places` collection by distance.
   */
  getNearbyPlaces: async (
    args: GetNearbyPlacesArgs,
    userIdOrContext?: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);

    const locationText = (args?.location || "").toString().trim();
    const domain = (args?.domain || "").toString().trim();
    const radiusKm = typeof args?.radiusKm === "number" ? args.radiusKm : 5;
    const limit = typeof args?.limit === "number" ? args.limit : 20;

    const currentLoc =
      ctx.location && typeof ctx.location === "object"
        ? {
          lat: (ctx.location as { lat: number; lng: number }).lat,
          lng: (ctx.location as { lat: number; lng: number }).lng,
        }
        : null;

    let origin: { lat: number; lng: number } | null =
      parseLatLng(locationText) ||
      (/^(current location|near me|me)$/i.test(locationText) || !locationText
        ? currentLoc
        : null);

    if (!origin && locationText) {
      try {
        const geo = await searchMapboxPlaces(locationText, {
          limit: 1,
          types: "place,locality,address",
        });
        if (geo[0]?.center) {
          origin = { lat: geo[0].center[1], lng: geo[0].center[0] };
        }
      } catch (e) {
        // Network/token may not be available; fall back to text filtering
      }
    }

    const category = normalizePlaceCategory(domain);
    // Use marketId from context for multi-market support
    const marketId = ctx.marketId;
    let places = await placesRepository.getByCityId(marketId, true);
    if (category) {
      places = places.filter((p) => p.category === category);
    }

    // Distance filter if we have an origin; otherwise fall back to text filter
    if (origin) {
      const placesWithDistance = places
        .filter((p) => !!p.coordinates)
        .map((p) => ({
          ...p,
          distanceKm: haversineKm(origin!, p.coordinates),
        }))
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);

      return {
        success: true,
        origin,
        radiusKm,
        count: placesWithDistance.length,
        places: placesWithDistance.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          address: p.address,
          areaName: p.areaName,
          distanceKm: Math.round(p.distanceKm * 100) / 100,
          coordinates: p.coordinates,
          tags: p.tags,
        })),
      };
    }

    if (!locationText) {
      return {
        success: false,
        error: "location is required (or share GPS location)",
      };
    }

    const filtered = places
      .filter((p) =>
        (p.areaName || "").toLowerCase().includes(locationText.toLowerCase()),
      )
      .slice(0, limit);

    return {
      success: true,
      origin: null,
      radiusKm: null,
      count: filtered.length,
      places: filtered.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        address: p.address,
        areaName: p.areaName,
        coordinates: p.coordinates,
        tags: p.tags,
      })),
      note: "GPS/geocoding unavailable; results filtered by areaName match only.",
    };
  },

  /**
   * Household supplies / groceries order
   * 
   * Pattern: Collect → Validate → Persist → Dispatch via WhatsApp
   */
  orderHouseholdSupplies: async (
    args: OrderHouseholdSuppliesArgs,
    userIdOrContext?: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    logger.debug("🛒 [OrderSupplies] New order:", args);

    try {
      const ctx = asToolContext(userIdOrContext);
      const userId = ctx.userId;

      // 1. Resolve customer info
      let customerPhone = args.contactPhone || "";
      let customerName = args.customerName || "Guest";

      if (userId && !customerPhone) {
        const userSnap = await db.collection("users").doc(userId).get();
        if (userSnap.exists) {
          const userData = userSnap.data() as UserData | undefined;
          customerPhone = userData?.phone || "";
          customerName = userData?.displayName || customerName;
        }
      }

      if (!customerPhone) {
        return { success: false, error: "Customer phone number is required" };
      }

      const deliveryAddress = args.deliveryAddress || "Address not specified";
      const items = Array.isArray(args.items) ? args.items.join(", ") : (args.items || "Items not specified");

      // 2. Find a vendor listing with order_supplies action enabled
      const vendorListings = await db.collection("listings")
        .where("merve.enabled", "==", true)
        .limit(20)
        .get();

      let vendorPhone: string | null = null;
      let vendorName = "Vendor";
      let vendorId: string | null = null;

      for (const doc of vendorListings.docs) {
        const listing = doc.data();
        const actions = listing.merve?.actions || [];
        const suppliesAction = actions.find(
          (a: { actionType: string; enabled: boolean }) =>
            a.actionType === "order_supplies" && a.enabled
        );

        if (suppliesAction) {
          vendorPhone = suppliesAction.dispatch?.toE164 || listing.merve?.whatsappE164 || null;
          vendorName = listing.title || listing.name || "Vendor";
          vendorId = doc.id;
          break;
        }
      }

      // 3. Persist order to Firestore
      const orderId = `GRO-${Date.now()}`;
      const orderData = {
        id: orderId,
        type: "household_supplies",
        items,
        deliveryAddress,
        customerName,
        customerPhone: customerPhone.replace("whatsapp:", ""),
        customerContact: customerPhone.replace("whatsapp:", ""),
        userId: userId || null,
        vendorListingId: vendorId,
        vendorPhone,
        status: vendorPhone ? "dispatched" : "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection("groceryOrders").doc(orderId).set(orderData);
      logger.debug(`✅ [OrderSupplies] Persisted order ${orderId}`);

      // 4. Dispatch via WhatsApp if vendor found
      if (vendorPhone) {
        const message =
          `🛒 *New Order from Easy Islanders*\n\n` +
          `📦 Items: ${items}\n` +
          `📍 Deliver to: ${deliveryAddress}\n` +
          `👤 Customer: ${customerName}\n` +
          `📞 Phone: ${customerPhone.replace("whatsapp:", "")}\n\n` +
          `Reply YES to confirm or NO to decline.`;

        try {
          const { sendWhatsApp } = await import("../twilio.service");
          const result = await sendWhatsApp(vendorPhone, message);

          await db.collection("groceryOrders").doc(orderId).update({
            dispatchMessageSid: result.sid,
            dispatchedAt: new Date().toISOString(),
          });

          logger.debug(`✅ [OrderSupplies] Dispatched to ${vendorName} (${vendorPhone})`);

          return {
            success: true,
            orderId,
            vendorName,
            status: "dispatched",
            message: `Order sent to ${vendorName}! They will contact you shortly.`,
          };
        } catch (whatsappErr: unknown) {
          logger.error("⚠️ [OrderSupplies] WhatsApp dispatch failed:", whatsappErr);
          // Order is still saved, just not dispatched
          return {
            success: true,
            orderId,
            status: "pending",
            message: "Order received. We're arranging delivery and will contact you shortly.",
            warning: "Automatic dispatch failed - manual follow-up required",
          };
        }
      }

      // 5. No vendor found - order saved for manual processing
      return {
        success: true,
        orderId,
        status: "pending",
        message: "Order received. We're arranging delivery and will contact you shortly.",
      };
    } catch (err: unknown) {
      console.error("🔴 [OrderSupplies] Failed:", err);
      return {
        success: false,
        error: getErrorMessage(err) || "Failed to process order",
      };
    }
  },

  /**
   * Service / handyman request
   */
  requestService: async (
    args: RequestServiceArgs,
    userIdOrContext?: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    logger.debug("🔧 [RequestService] New request:", args);
    return {
      success: true,
      requestId: `SRV-${Date.now()}`,
      userId: ctx.userId || null,
    };
  },

  /**
   * Show a map pin
   */
  showMap: async (args: {
    lat: number;
    lng: number;
    title?: string;
  }): Promise<ToolResult> => {
    logger.debug("🗺️ [Map] showMap called:", args);
    return {
      success: true,
      lat: args.lat,
      lng: args.lng,
      title: args.title || "Location",
    };
  },

  /**
   * Compute distance between two points
   */
  computeDistance: async (args: ComputeDistanceArgs): Promise<ToolResult> => {
    const parse = (str: string) => {
      const parts = (str || "")
        .split(",")
        .map((p: string) => parseFloat(p.trim()));
      if (parts.length !== 2 || parts.some(isNaN)) return null;
      return { lat: parts[0], lon: parts[1] };
    };
    const a = parse(args.from);
    const b = parse(args.to);
    if (!a || !b) return { success: false, error: "Invalid coordinates" };

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const hav =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return { success: true, distanceKm: Math.round(R * c * 100) / 100 };
  },

  /**
   * Fetch hotspots
   */
  fetchHotspots: async (args: FetchHotspotsArgs): Promise<ToolResult> => {
    logger.debug("Fetch hotspots", args);
    try {
      const snap = await db
        .collection("checkIns")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
      const tally: Record<string, number> = {};
      snap.forEach((doc) => {
        const data = doc.data();
        if (
          args.area &&
          data.location &&
          !String(data.location).includes(args.area)
        )
          return;
        const key = data.placeName || data.placeId || "unknown";
        tally[key] = (tally[key] || 0) + 1;
      });
      const hotspots = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([place, score]) => ({ place, score }));
      return { success: true, hotspots };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  /**
   * Get area info
   */
  getAreaInfo: async (args: AreaInfoArgs): Promise<ToolResult> => {
    const vibe = await miscTools.fetchHotspots({ area: args.area });
    return { success: true, area: args.area, hotspots: vibe.hotspots || [] };
  },
};
