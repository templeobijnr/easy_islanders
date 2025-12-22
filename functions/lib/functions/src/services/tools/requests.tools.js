"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestsTools = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../../config/firebase");
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@askmerve/shared");
// ─────────────────────────────────────────────────────────────────────────────
// Requests Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.requestsTools = {
    /**
     * Create a generic service request
     */
    createServiceRequest: async (args, ctx) => {
        logger.debug("🛠️ [Requests] Create Service Request:", args);
        // Prefer marketId, fall back to deprecated cityId, then DEFAULT_MARKET_ID
        const resolvedMarketId = ctx.marketId || ctx.cityId || shared_1.DEFAULT_MARKET_ID;
        const { userId } = ctx;
        const now = new Date();
        // Create a new document reference
        const ref = firebase_1.db.collection("requests").doc();
        // Construct the request object
        const request = {
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
    createOrder: async (args, ctx) => {
        logger.debug("🛒 [Requests] Create Order:", args);
        // Prefer marketId, fall back to deprecated cityId, then DEFAULT_MARKET_ID
        const resolvedMarketId = ctx.marketId || ctx.cityId || shared_1.DEFAULT_MARKET_ID;
        const { userId } = ctx;
        const now = new Date();
        const ref = firebase_1.db.collection("requests").doc();
        const request = {
            id: ref.id,
            cityId: resolvedMarketId,
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
//# sourceMappingURL=requests.tools.js.map