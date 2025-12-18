import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const searchRestaurantsToolDef: FunctionDeclaration = {
  name: "searchRestaurants",
  description:
    "Search for restaurants by cuisine type, name, or area in North Cyprus.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      cuisine: {
        type: SchemaType.STRING,
        description: "Type of cuisine: Turkish, Kebab, Seafood, Italian, etc.",
      },
      name: {
        type: SchemaType.STRING,
        description: "Restaurant name to search for.",
      },
      area: {
        type: SchemaType.STRING,
        description: "Area/district: Girne, Lefkosa, Gazimagusa, etc.",
      },
    },
    required: [],
  },
};

export const orderFoodToolDef: FunctionDeclaration = {
  name: "orderFood",
  description:
    "Order food from a restaurant for delivery. Creates a proposal that must be confirmed with YES.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      restaurantName: {
        type: SchemaType.STRING,
        description: "Name of the restaurant to order from.",
      },
      cuisine: {
        type: SchemaType.STRING,
        description: "Type of cuisine if restaurant name not specified.",
      },
      area: {
        type: SchemaType.STRING,
        description: "Area for delivery: Girne, Lefkosa, etc.",
      },
      items: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Food items to order.",
      },
      quantities: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.NUMBER },
        description: "Quantities for each item.",
      },
      deliveryAddress: {
        type: SchemaType.STRING,
        description: "Delivery address.",
      },
      specialInstructions: {
        type: SchemaType.STRING,
        description: "Special requests or notes.",
      },
    },
    required: ["deliveryAddress"],
  },
};

export const bookServiceToolDef: FunctionDeclaration = {
  name: "bookService",
  description:
    "Book a home service (plumber, electrician, handyman, AC technician, etc.). Creates a proposal.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      serviceType: {
        type: SchemaType.STRING,
        format: "enum",
        enum: [
          "plumber",
          "electrician",
          "handyman",
          "ac_technician",
          "painter",
          "gardener",
          "cleaner",
          "locksmith",
          "pest_control",
          "pool_maintenance",
        ],
        description: "Type of service needed.",
      },
      area: {
        type: SchemaType.STRING,
        description: "Area: Girne, Lefkosa, etc.",
      },
      description: {
        type: SchemaType.STRING,
        description: "Description of the issue or work needed.",
      },
      address: {
        type: SchemaType.STRING,
        description: "Service address.",
      },
      urgency: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["emergency", "today", "this_week", "flexible"],
      },
    },
    required: ["serviceType", "description", "address"],
  },
};

export const findPharmacyToolDef: FunctionDeclaration = {
  name: "findPharmacy",
  description: "Find on-duty pharmacies for today in North Cyprus.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      district: {
        type: SchemaType.STRING,
        description: "District to filter: Girne, Lefkosa, Gazimagusa, etc.",
      },
    },
    required: [],
  },
};

export const getNewsToolDef: FunctionDeclaration = {
  name: "getNews",
  description: "Get the latest news headlines from North Cyprus.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
    required: [],
  },
};

export const getExchangeRateToolDef: FunctionDeclaration = {
  name: "getExchangeRate",
  description: "Get currency exchange rates (EUR, GBP, USD, TRY).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      from: {
        type: SchemaType.STRING,
        description: "Source currency code: EUR, GBP, USD, TRY.",
      },
      to: {
        type: SchemaType.STRING,
        description: "Target currency code.",
      },
    },
    required: [],
  },
};
