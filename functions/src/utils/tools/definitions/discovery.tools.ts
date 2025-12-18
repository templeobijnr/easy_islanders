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
