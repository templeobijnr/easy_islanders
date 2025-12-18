import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const createItineraryTool: FunctionDeclaration = {
  name: "createItinerary",
  description: "Create a new itinerary/plan.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
    },
    required: ["title"],
  },
};

export const addToItineraryTool: FunctionDeclaration = {
  name: "addToItinerary",
  description: "Add an item to an itinerary.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itineraryId: { type: SchemaType.STRING },
      itemId: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      day: { type: SchemaType.NUMBER },
    },
    required: ["itineraryId", "itemId", "title"],
  },
};

export const removeFromItineraryTool: FunctionDeclaration = {
  name: "removeFromItinerary",
  description: "Remove an item from an itinerary.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itineraryId: { type: SchemaType.STRING },
      itemId: { type: SchemaType.STRING },
    },
    required: ["itineraryId", "itemId"],
  },
};

export const getItineraryTool: FunctionDeclaration = {
  name: "getItinerary",
  description: "Fetch itinerary details.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itineraryId: { type: SchemaType.STRING },
    },
    required: ["itineraryId"],
  },
};

export const saveItineraryTool: FunctionDeclaration = {
  name: "saveItinerary",
  description: "Save itinerary changes.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itineraryId: { type: SchemaType.STRING },
    },
    required: ["itineraryId"],
  },
};
