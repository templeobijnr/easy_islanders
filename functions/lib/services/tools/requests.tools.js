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
const firebase_1 = require("../../config/firebase");
exports.requestsTools = {
    /**
     * Create a generic service request
     */
    createServiceRequest: async (args, ctx) => {
        console.log("🛠️ [Requests] Create Service Request:", args);
        const { userId, cityId } = ctx;
        const now = new Date();
        // Create a new document reference
        const ref = firebase_1.db.collection('requests').doc();
        // Construct the request object
        const request = {
            id: ref.id,
            cityId: cityId || 'north-cyprus', // Default if missing
            type: 'SERVICE',
            userId: userId || 'anonymous',
            status: 'new',
            createdAt: admin.firestore.Timestamp.fromDate(now),
            updatedAt: admin.firestore.Timestamp.fromDate(now),
            // Service specific details
            assignedProviderId: undefined,
            origin: args.addressText ? { addressText: args.addressText } : undefined,
            // Use generic meta or specific fields if we update the type definition to match args exactly
            // For now mapping to the Request interface structure
            service: {
                title: args.title || args.serviceSubcategory || args.serviceCategory,
                description: args.description
            },
            // Store extra fields in meta for now if they don't fit perfectly
            meta: {
                serviceCategory: args.serviceCategory,
                serviceSubcategory: args.serviceSubcategory,
                scheduledTimeText: args.scheduledTimeText
            }
        };
        await ref.set(request);
        console.log(`✅ [Requests] Created Service Request ${ref.id}`);
        return {
            success: true,
            requestId: ref.id,
            message: "Service request created successfully. We will find a provider for you."
        };
    },
    /**
     * Create an order for water, gas, or groceries
     */
    createOrder: async (args, ctx) => {
        console.log("🛒 [Requests] Create Order:", args);
        const { userId, cityId } = ctx;
        const now = new Date();
        const ref = firebase_1.db.collection('requests').doc();
        const request = {
            id: ref.id,
            cityId: cityId || 'north-cyprus',
            type: 'ORDER',
            userId: userId || 'anonymous',
            status: 'new',
            createdAt: admin.firestore.Timestamp.fromDate(now),
            updatedAt: admin.firestore.Timestamp.fromDate(now),
            origin: args.addressText ? { addressText: args.addressText } : undefined,
            order: {
                type: args.orderType,
                bottleSizeLiters: args.bottleSizeLiters,
                quantity: args.quantity,
                items: args.groceryItems,
                notes: args.notes
            }
        };
        await ref.set(request);
        console.log(`✅ [Requests] Created Order ${ref.id}`);
        return {
            success: true,
            requestId: ref.id,
            message: `Order for ${args.orderType} created successfully.`
        };
    }
};
// Need to import admin for Timestamp
const admin = __importStar(require("firebase-admin"));
//# sourceMappingURL=requests.tools.js.map