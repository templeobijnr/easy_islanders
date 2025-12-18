import * as logger from "firebase-functions/logger";
import { db } from "../../config/firebase";
import { Request } from "../../types/requests";

export const requestsTools = {
  /**
   * Create a generic service request
   */
  createServiceRequest: async (args: any, ctx: any): Promise<any> => {
    logger.debug("🛠️ [Requests] Create Service Request:", args);
    const { userId, cityId } = ctx;
    const now = new Date();

    // Create a new document reference
    const ref = db.collection("requests").doc();

    // Construct the request object
    const request: Request = {
      id: ref.id,
      cityId: cityId || "north-cyprus", // Default if missing
      type: "SERVICE",
      userId: userId || "anonymous",
      status: "new",
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),

      // Service specific details
      assignedProviderId: undefined,
      origin: args.addressText ? { addressText: args.addressText } : undefined,

      // Use generic meta or specific fields if we update the type definition to match args exactly
      // For now mapping to the Request interface structure
      service: {
        title: args.title || args.serviceSubcategory || args.serviceCategory,
        description: args.description,
      },

      // Store extra fields in meta for now if they don't fit perfectly
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
      message:
        "Service request created successfully. We will find a provider for you.",
    };
  },

  /**
   * Create an order for water, gas, or groceries
   */
  createOrder: async (args: any, ctx: any): Promise<any> => {
    logger.debug("🛒 [Requests] Create Order:", args);
    const { userId, cityId } = ctx;
    const now = new Date();

    const ref = db.collection("requests").doc();

    const request: Request = {
      id: ref.id,
      cityId: cityId || "north-cyprus",
      type: "ORDER",
      userId: userId || "anonymous",
      status: "new",
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),

      origin: args.addressText ? { addressText: args.addressText } : undefined,

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

// Need to import admin for Timestamp
import * as admin from "firebase-admin";
