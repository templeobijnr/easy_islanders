import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const searchMarketplaceTool: FunctionDeclaration = {
  name: "searchMarketplace",
  description:
    "Search for Cars and Properties FOR SALE. DO NOT use for rentals, villas, apartments, or stays - use searchStays for those instead.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      domain: {
        type: SchemaType.STRING,
        description:
          'The domain: "Cars" or "Real Estate FOR SALE". NOT for rentals.',
      },
      subCategory: {
        type: SchemaType.STRING,
        description:
          'Filter by type: "sale" (properties), "rental" (cars only, not homes).',
      },
      location: {
        type: SchemaType.STRING,
        description: 'Location filter (e.g., "Kyrenia", "Famagusta").',
      },
      query: {
        type: SchemaType.STRING,
        description: "Keywords to match against title or tags.",
      },
      minPrice: {
        type: SchemaType.NUMBER,
        description: "Minimum price filter.",
      },
      maxPrice: {
        type: SchemaType.NUMBER,
        description:
          'Maximum price filter. Use this for "affordable" or "budget" queries.',
      },
      amenities: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          'List of required amenities (e.g., ["Pool", "Wifi", "Gym"]).',
      },
      sortBy: {
        type: SchemaType.STRING,
        description:
          'Sorting order. Options: "price_asc" (Cheapest), "price_desc" (Expensive), "rating" (Top Rated).',
      },
    },
    required: ["domain"],
  },
};

