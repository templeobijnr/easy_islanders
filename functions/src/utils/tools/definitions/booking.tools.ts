import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const initiateBookingTool: FunctionDeclaration = {
  name: "initiateBooking",
  description:
    "Finalize a booking or viewing request. Only call after collecting required details.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itemId: { type: SchemaType.STRING },
      flowType: {
        type: SchemaType.STRING,
        description:
          "STRICTLY: 'short_term_rental' (Holiday/Cars - Requires Payment) OR 'long_term_viewing' (Long Term/Sales - Requires Agent Appointment).",
      },
      customerName: {
        type: SchemaType.STRING,
        description: "Full name of the customer.",
      },
      customerContact: {
        type: SchemaType.STRING,
        description: "Email or WhatsApp number.",
      },

      // Short Term Specifics
      checkInDate: {
        type: SchemaType.STRING,
        description: "For Short Term/Cars: Start Date",
      },
      checkOutDate: {
        type: SchemaType.STRING,
        description: "For Short Term/Cars: End Date",
      },

      // Long Term Specifics
      viewingSlot: {
        type: SchemaType.STRING,
        description:
          "For Long Term/Sales: Requested Date/Time to view property.",
      },

      // General
      specialRequests: {
        type: SchemaType.STRING,
        description: "Any specific needs, allergies, or questions.",
      },
      needsPickup: {
        type: SchemaType.BOOLEAN,
        description: "True if they requested an airport transfer or taxi.",
      },
    },
    required: ["itemId", "flowType", "customerName", "customerContact"],
  },
};

export const createPaymentIntentTool: FunctionDeclaration = {
  name: "createPaymentIntent",
  description:
    "Create a payment intent for a booking (card or crypto). Call only after a short-term booking is created and the user confirms pay-now.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      bookingId: {
        type: SchemaType.STRING,
        description: "Booking ID to pay for.",
      },
      channel: {
        type: SchemaType.STRING,
        description: "Payment channel: 'card' or 'crypto'.",
      },
    },
    required: ["bookingId"],
  },
};

export const scheduleViewingTool: FunctionDeclaration = {
  name: "scheduleViewing",
  description:
    "Create a viewing request for a long-term or for-sale listing and notify the owner/agent.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      listingId: { type: SchemaType.STRING },
      customerName: { type: SchemaType.STRING },
      customerContact: {
        type: SchemaType.STRING,
        description: "Email or WhatsApp number for the prospect.",
      },
      preferredSlot: {
        type: SchemaType.STRING,
        description: "Requested date/time window.",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Extra details or requirements.",
      },
    },
    required: ["listingId", "customerName", "customerContact"],
  },
};
