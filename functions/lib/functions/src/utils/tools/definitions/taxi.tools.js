"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchTaxiTool = exports.requestTaxiTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.requestTaxiTool = {
    name: "requestTaxi",
    description: "Request a taxi using the new dispatch system. Broadcasts to available drivers who can accept. Ask for human-readable locations only.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            pickupAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Human-readable pickup address or landmark",
            },
            pickupDistrict: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'District/area for pickup: "Girne" (Kyrenia), "Lefkosa" (Nicosia), "Famagusta", "Iskele", etc.',
            },
            pickupLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Pickup GPS latitude - automatically provided",
            },
            pickupLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Pickup GPS longitude - automatically provided",
            },
            dropoffAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Human-readable destination address or landmark",
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer name (auto-fetched from profile if available)",
            },
            customerPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer phone in E.164 format (auto-fetched from profile if available)",
            },
            priceEstimate: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Estimated price in TL",
            },
        },
        required: ["pickupAddress", "pickupDistrict", "dropoffAddress"],
    },
};
exports.dispatchTaxiTool = {
    name: "dispatchTaxi",
    description: "Dispatch a taxi to pick up the user. Sends WhatsApp message to taxi service. Ask user for location names (hotels, landmarks, areas) - NEVER ask for latitude/longitude as users don't understand coordinates. The system will provide GPS data automatically.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            pickupLocation: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable pickup location: hotel name, landmark, neighborhood, or "Current location". Examples: "Girne Marina", "Acapulco Resort", "Current location"',
            },
            destination: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable destination: place name, hotel, landmark, or address. Examples: "Bellapais Abbey", "Lefkosa City Center", "Near Eastern University"',
            },
            pickupLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Pickup GPS latitude - automatically provided by system, do not ask user",
            },
            pickupLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Pickup GPS longitude - automatically provided by system, do not ask user",
            },
            destinationLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Destination GPS latitude - automatically provided by system, do not ask user",
            },
            destinationLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "OPTIONAL: Destination GPS longitude - automatically provided by system, do not ask user",
            },
            pickupTime: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Requested pickup time (e.g., "now", "in 30 minutes", "tomorrow 9am")',
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer name (will be fetched automatically from user profile if not provided)",
            },
            customerContact: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer phone number or WhatsApp number (will be fetched automatically from user profile if not provided)",
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional notes or special requirements (e.g., "large luggage", "wheelchair accessible")',
            },
        },
        required: ["pickupLocation"],
    },
};
//# sourceMappingURL=taxi.tools.js.map