import * as logger from "firebase-functions/logger";
import { db } from "../../config/firebase";
import { Request } from "../../types/requests";
import * as admin from "firebase-admin";
import { type MarketId, DEFAULT_MARKET_ID } from "@askmerve/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Typed Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceRequestArgs {
  addressText?: string;
  title?: string;
  description?: string;
  serviceCategory?: string;
  serviceSubcategory?: string;
  scheduledTimeText?: string;
}

interface OrderArgs {
  addressText?: string;
  orderType: 'water' | 'gas' | 'grocery';
  bottleSizeLiters?: number;
  quantity?: number;
  groceryItems?: string[];
  notes?: string;
}

interface RequestContext {
  userId?: string;
  /** Market ID - required for multi-market support */
  marketId?: MarketId;
  /** @deprecated Use marketId instead */
  cityId?: string;
}

interface ToolResult {
  success: boolean;
  error?: string;
  requestId?: string;
  message?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const requestsTools = {
  /**
   * Create a generic service request
   */
  createServiceRequest: async (args: ServiceRequestArgs, ctx: RequestContext): Promise<ToolResult> => {
    logger.debug("🛠️ [Requests] Create Service Request:", args);
    // Prefer marketId, fall back to deprecated cityId, then DEFAULT_MARKET_ID
    const resolvedMarketId = ctx.marketId || ctx.cityId as MarketId || DEFAULT_MARKET_ID;
    const { userId } = ctx;
    const now = new Date();

    // Create a new document reference
    const ref = db.collection("requests").doc();

    // Construct the request object
    const request: Request = {
      id: ref.id,
      cityId: resolvedMarketId,
      type: "SERVICE",
      userId: userId || "anonymous",
      status: "new",
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),

      assignedProviderId: undefined,
      origin: args.addressText ? { addressText: args.addressText } : undefined,

      service: {
        title: args.title || args.serviceSubcategory || args.serviceCategory || 'Service Request',
        description: args.description || '',
      },

      meta: {
        serviceCategory: args.serviceCategory,
        serviceSubcategory: args.serviceSubcategory,
        scheduledTimeText: args.scheduledTimeText,
      },
    };

    await ref.set(request);
    logger.debug(`✅ [Requests] Created Service Request ${ref.id}`);

    return {
      success: true,
      requestId: ref.id,
      message: "Service request created successfully. We will find a provider for you.",
    };
  },

  /**
   * Create an order for water, gas, or groceries
   */
  createOrder: async (args: OrderArgs, ctx: RequestContext): Promise<ToolResult> => {
    logger.debug("🛒 [Requests] Create Order:", args);
    // Prefer marketId, fall back to deprecated cityId, then DEFAULT_MARKET_ID
    const resolvedMarketId = ctx.marketId || ctx.cityId as MarketId || DEFAULT_MARKET_ID;
    const { userId } = ctx;
    const now = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // FAIL-CLOSED VALIDATION (deliveries require a confirmed address)
    // ─────────────────────────────────────────────────────────────────────────
    const addressText = (args.addressText || "").trim();
    if (!addressText) {
      return {
        success: false,
        error: "Delivery address is required before creating an order.",
        message: "What address should we deliver to?",
        missing: ["addressText"],
      };
    }

    // Quantity is required for all orders (fail-closed: do not guess)
    if (!args.quantity || !Number.isFinite(args.quantity) || args.quantity < 1) {
      return {
        success: false,
        error: "Quantity is required before creating an order.",
        message: "How many do you want?",
        missing: ["quantity"],
      };
    }

    // Water orders require bottle size (do not assume 12L/19L)
    if (args.orderType === "water" && (!args.bottleSizeLiters || args.bottleSizeLiters <= 0)) {
      return {
        success: false,
        error: "Bottle size is required for water orders.",
        message: "What bottle size (in liters) do you want (e.g., 19)?",
        missing: ["bottleSizeLiters"],
      };
    }

    const ref = db.collection("requests").doc();

    const request: Request = {
      id: ref.id,
      cityId: resolvedMarketId,
      type: "ORDER",
      userId: userId || "anonymous",
      status: "new",
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),

      origin: { addressText },

      order: {
        type: args.orderType,
        bottleSizeLiters: args.bottleSizeLiters,
        quantity: args.quantity,
        items: args.groceryItems,
        notes: args.notes,
      },
    };

    await ref.set(request);
    logger.debug(`✅ [Requests] Created Order ${ref.id}`);

    return {
      success: true,
      requestId: ref.id,
      message: `Order for ${args.orderType} created successfully.`,
    };
  },
};
