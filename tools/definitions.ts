
import { FunctionDeclaration, Type } from "@google/genai";

export const searchMarketplaceTool: FunctionDeclaration = {
  name: 'searchMarketplace',
  description: 'Search the database for Real Estate, Cars, Services, etc. Returns full details including amenities.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      domain: {
        type: Type.STRING,
        description: 'The domain: "Real Estate", "Cars", "Services", "Restaurants", "Events".',
      },
      subCategory: {
        type: Type.STRING,
        description: 'Filter by specific type: "sale", "short-term", "long-term", "project", "rental" (cars).',
      },
      location: {
        type: Type.STRING,
        description: 'Location filter (e.g., "Kyrenia", "Famagusta").',
      },
      query: {
        type: Type.STRING,
        description: 'Keywords to match against title or tags.',
      },
      minPrice: {
        type: Type.NUMBER,
        description: 'Minimum price filter.',
      },
      maxPrice: {
        type: Type.NUMBER,
        description: 'Maximum price filter. Use this for "affordable" or "budget" queries.',
      },
      amenities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of required amenities (e.g., ["Pool", "Wifi", "Gym"]).',
      },
      sortBy: {
        type: Type.STRING,
        description: 'Sorting order. Options: "price_asc" (Cheapest), "price_desc" (Expensive), "rating" (Top Rated).',
      }
    },
    required: ['domain']
  },
};

export const consultEncyclopediaTool: FunctionDeclaration = {
  name: 'consultEncyclopedia',
  description: 'Look up static laws, regulations, and administrative procedures in North Cyprus. Use this for Taxes, Residency, Visas, Title Deeds, Utilities.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: 'The category to look up: "real_estate_law", "residency_visas", "utilities_admin", "emergency_health", "banking_currency".',
      }
    },
    required: ['topic']
  }
};

export const getRealTimeInfoTool: FunctionDeclaration = {
  name: 'getRealTimeInfo',
  description: 'Get dynamic/changing information like Weather, Currency Exchange Rates, or Duty Pharmacies.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: 'One of: "weather", "currency", "duty_pharmacy".',
      },
      location: {
        type: Type.STRING,
        description: 'Optional location filter (e.g., "Kyrenia").',
      }
    },
    required: ['category']
  }
};

export const initiateBookingTool: FunctionDeclaration = {
  name: 'initiateBooking',
  description: 'Finalize a booking or viewing request. Only call after collecting required details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: { type: Type.STRING },
      flowType: { 
        type: Type.STRING, 
        description: "STRICTLY: 'short_term_rental' (Holiday/Cars - Requires Payment) OR 'long_term_viewing' (Long Term/Sales - Requires Agent Appointment)." 
      },
      customerName: { type: Type.STRING, description: "Full name of the customer." },
      customerContact: { type: Type.STRING, description: "Email or WhatsApp number." },
      
      // Short Term Specifics
      checkInDate: { type: Type.STRING, description: "For Short Term/Cars: Start Date" },
      checkOutDate: { type: Type.STRING, description: "For Short Term/Cars: End Date" },
      
      // Long Term Specifics
      viewingSlot: { type: Type.STRING, description: "For Long Term/Sales: Requested Date/Time to view property." },
      
      // General
      specialRequests: { type: Type.STRING, description: "Any specific needs, allergies, or questions." },
      needsPickup: { type: Type.BOOLEAN, description: "True if they requested an airport transfer or taxi." }
    },
    required: ['itemId', 'flowType', 'customerName', 'customerContact']
  },
};

export const sendWhatsAppMessageTool: FunctionDeclaration = {
  name: 'sendWhatsAppMessage',
  description: 'Send a WhatsApp message to the property agent/owner. Use this for Long-Term rentals, Sales, and Projects after creating a viewing request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      agentPhone: { type: Type.STRING, description: "The agentPhone field from the listing." },
      messageBody: { type: Type.STRING, description: "The content of the message to send to the agent." },
      listingId: { type: Type.STRING }
    },
    required: ['agentPhone', 'messageBody']
  }
};

export const dispatchTaxiTool: FunctionDeclaration = {
  name: 'dispatchTaxi',
  description: 'Dispatch a taxi to the user\'s shared location. REQUIRES: Name, Phone, and Latitude/Longitude.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: { type: Type.NUMBER, description: "GPS Latitude provided by user." },
      longitude: { type: Type.NUMBER, description: "GPS Longitude provided by user." },
      customerName: { type: Type.STRING, description: "Full name of the passenger." },
      customerPhone: { type: Type.STRING, description: "Contact number for the driver." },
      destination: { type: Type.STRING, description: "Optional destination." }
    },
    required: ['latitude', 'longitude', 'customerName', 'customerPhone']
  }
};

export const createConsumerRequestTool: FunctionDeclaration = {
  name: 'createConsumerRequest',
  description: 'Create a specific request for an item or service that was not found in the marketplace. This forwards the request to local businesses.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "What the user is looking for (e.g. 'I need a vintage 1960s Mustang' or 'Looking for a gluten-free wedding cake')." },
      domain: { type: Type.STRING, description: "The category of the request (Real Estate, Cars, Services, etc)." },
      budget: { type: Type.NUMBER, description: "Optional max budget." }
    },
    required: ['content', 'domain']
  }
};

export const ALL_TOOL_DEFINITIONS = [
  searchMarketplaceTool,
  consultEncyclopediaTool,
  getRealTimeInfoTool,
  initiateBookingTool,
  sendWhatsAppMessageTool,
  dispatchTaxiTool,
  createConsumerRequestTool
];
