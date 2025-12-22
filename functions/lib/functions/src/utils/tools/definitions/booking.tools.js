"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleViewingTool = exports.createPaymentIntentTool = exports.initiateBookingTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.initiateBookingTool = {
    name: "initiateBooking",
    description: "Finalize a booking or viewing request. Only call after collecting required details.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itemId: { type: generative_ai_1.SchemaType.STRING },
            flowType: {
                type: generative_ai_1.SchemaType.STRING,
                description: "STRICTLY: 'short_term_rental' (Holiday/Cars - Requires Payment) OR 'long_term_viewing' (Long Term/Sales - Requires Agent Appointment).",
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Full name of the customer.",
            },
            customerContact: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Email or WhatsApp number.",
            },
            // Short Term Specifics
            checkInDate: {
                type: generative_ai_1.SchemaType.STRING,
                description: "For Short Term/Cars: Start Date",
            },
            checkOutDate: {
                type: generative_ai_1.SchemaType.STRING,
                description: "For Short Term/Cars: End Date",
            },
            // Long Term Specifics
            viewingSlot: {
                type: generative_ai_1.SchemaType.STRING,
                description: "For Long Term/Sales: Requested Date/Time to view property.",
            },
            // General
            specialRequests: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Any specific needs, allergies, or questions.",
            },
            needsPickup: {
                type: generative_ai_1.SchemaType.BOOLEAN,
                description: "True if they requested an airport transfer or taxi.",
            },
        },
        required: ["itemId", "flowType", "customerName", "customerContact"],
    },
};
exports.createPaymentIntentTool = {
    name: "createPaymentIntent",
    description: "Create a payment intent for a booking (card or crypto). Call only after a short-term booking is created and the user confirms pay-now.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            bookingId: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Booking ID to pay for.",
            },
            channel: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Payment channel: 'card' or 'crypto'.",
            },
        },
        required: ["bookingId"],
    },
};
exports.scheduleViewingTool = {
    name: "scheduleViewing",
    description: "Create a viewing request for a long-term or for-sale listing and notify the owner/agent.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            listingId: { type: generative_ai_1.SchemaType.STRING },
            customerName: { type: generative_ai_1.SchemaType.STRING },
            customerContact: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Email or WhatsApp number for the prospect.",
            },
            preferredSlot: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Requested date/time window.",
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Extra details or requirements.",
            },
        },
        required: ["listingId", "customerName", "customerContact"],
    },
};
//# sourceMappingURL=booking.tools.js.map