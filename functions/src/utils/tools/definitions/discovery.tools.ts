import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const searchLocalPlacesTool: FunctionDeclaration = {
  name: "searchLocalPlaces",
  description:
    "Search local places like restaurants, nightlife, beaches, cafes, experiences.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      domain: {
        type: SchemaType.STRING,
        description:
          "Category of place: restaurants, nightlife, beaches, cafes, experiences, shops.",
      },
      location: {
        type: SchemaType.STRING,
        description: "City/area to search in.",
      },
      query: { type: SchemaType.STRING, description: "Free-text keywords." },
      sortBy: {
        type: SchemaType.STRING,
        description: "Sorting order: price_asc, price_desc, rating.",
      },
    },
    required: ["domain"],
  },
};

export const searchEventsTool: FunctionDeclaration = {
  name: "searchEvents",
  description: "Search events and happenings.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: {
        type: SchemaType.STRING,
        description: "City/area to search in.",
      },
      query: {
        type: SchemaType.STRING,
        description: "Keywords for the event.",
      },
      dateRange: {
        type: SchemaType.STRING,
        description: "Optional date range filter.",
      },
    },
  },
};

export const searchStaysTool: FunctionDeclaration = {
  name: "searchStays",
  description:
    "PRIMARY TOOL for stays, rentals, accommodation. Use for: daily rentals, villas, apartments, holiday homes, short-term rentals, vacation homes, places to stay, accommodation requests. This is the ONLY tool for rental properties.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: {
        type: SchemaType.STRING,
        description: "City/area: Kyrenia, Famagusta, Nicosia, Alsancak, etc.",
      },
      type: {
        type: SchemaType.STRING,
        description: "Type of stay: villa, apartment, daily, long-term, studio, holiday home.",
      },
      minPrice: {
        type: SchemaType.NUMBER,
        description: "Minimum price per night or month.",
      },
      maxPrice: {
        type: SchemaType.NUMBER,
        description: "Maximum price per night or month.",
      },
      bedrooms: {
        type: SchemaType.NUMBER,
        description: "Minimum number of bedrooms required.",
      },
    },
  },
};
