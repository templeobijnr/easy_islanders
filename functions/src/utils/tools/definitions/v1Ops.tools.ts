import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const orderHouseholdSuppliesTool: FunctionDeclaration = {
  name: "orderHouseholdSupplies",
  description:
    "Order essential household items (water, gas, groceries, bread, milk) from local markets. This is a message-to-market dispatcher - sends request directly to vendors via WhatsApp.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      items: {
        type: SchemaType.STRING,
        description:
          'List of items to order, e.g., "2 water bottles, 1 gas cylinder, bread, milk"',
      },
      deliveryAddress: {
        type: SchemaType.STRING,
        description: "Full delivery address or location",
      },
      contactPhone: {
        type: SchemaType.STRING,
        description:
          "Customer contact phone (will be auto-fetched from profile if not provided)",
      },
      customerName: {
        type: SchemaType.STRING,
        description:
          "Customer name (will be auto-fetched from profile if not provided)",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Additional instructions or special requirements",
      },
    },
    required: ["items", "deliveryAddress"],
  },
};

export const requestServiceTool: FunctionDeclaration = {
  name: "requestService",
  description:
    "Request a service professional (plumber, electrician, cleaner, AC technician, handyman). Sends job lead to available providers.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      serviceType: {
        type: SchemaType.STRING,
        description:
          "Type of service needed: plumber, electrician, cleaner, ac_tech, handyman, painter, gardener",
      },
      description: {
        type: SchemaType.STRING,
        description: "Brief description of the problem or work needed",
      },
      urgency: {
        type: SchemaType.STRING,
        description:
          "How urgent is the service: emergency, today, this_week, flexible",
      },
      location: {
        type: SchemaType.STRING,
        description: "Location where service is needed",
      },
      contactPhone: {
        type: SchemaType.STRING,
        description:
          "Customer contact phone (will be auto-fetched from profile if not provided)",
      },
      customerName: {
        type: SchemaType.STRING,
        description:
          "Customer name (will be auto-fetched from profile if not provided)",
      },
    },
    required: ["serviceType", "description", "location"],
  },
};

export const searchHousingListingsToolDef: FunctionDeclaration = {
  name: "searchHousingListings",
  description:
    "Search for housing listings (apartments, studios, villas, rooms) in the current city.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      budgetMin: { type: SchemaType.NUMBER },
      budgetMax: { type: SchemaType.NUMBER },
      bedrooms: { type: SchemaType.NUMBER },
      areaName: {
        type: SchemaType.STRING,
        description: "Preferred area/neighbourhood (e.g. near GAU)",
      },
      intent: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["rent", "buy", "invest"],
      },
    },
    required: [],
  },
};

export const createServiceRequestToolDef: FunctionDeclaration = {
  name: "createServiceRequest",
  description:
    "Create a generic service request (wifi, cleaning, handyman, residency, etc.).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      serviceCategory: {
        type: SchemaType.STRING,
        format: "enum",
        enum: [
          "HOME_PROPERTY",
          "TECH_DIGITAL",
          "LEGAL_ADMIN",
          "TRANSPORT_SHOPPING",
          "PACKAGE_DELIVERY",
          "LIFESTYLE_CONCIERGE",
        ],
      },
      serviceSubcategory: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      addressText: { type: SchemaType.STRING },
      scheduledTimeText: { type: SchemaType.STRING },
    },
    required: ["serviceCategory", "description"],
  },
};

export const createOrderToolDef: FunctionDeclaration = {
  name: "createOrder",
  description:
    "Create an order for water, gas, or groceries to be delivered to the user.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderType: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["water", "gas", "grocery"],
      },
      bottleSizeLiters: {
        type: SchemaType.NUMBER,
        description: "For water/gas: bottle size in liters, if known.",
      },
      quantity: {
        type: SchemaType.NUMBER,
        description: "Number of bottles/packs.",
      },
      groceryItems: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of grocery items if this is a grocery order.",
      },
      addressText: {
        type: SchemaType.STRING,
        description: "Delivery address or description of location.",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Any extra details for the vendor.",
      },
    },
    required: ["orderType"],
  },
};

export const searchPlacesToolDef: FunctionDeclaration = {
  name: "searchPlaces",
  description:
    "Search curated places (food, nightlife, sights, cafes, services) in the current city.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        format: "enum",
        enum: [
          "food",
          "nightlife",
          "sight",
          "cafe",
          "shopping",
          "service",
          "other",
        ],
      },
      tag: { type: SchemaType.STRING },
      limit: { type: SchemaType.NUMBER },
    },
    required: [],
  },
};
