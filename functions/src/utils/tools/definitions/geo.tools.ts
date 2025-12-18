import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const getNearbyPlacesTool: FunctionDeclaration = {
  name: "getNearbyPlaces",
  description: "Find nearby places using geo lookup.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: { type: SchemaType.STRING },
      domain: { type: SchemaType.STRING },
    },
    required: ["location"],
  },
};

export const computeDistanceTool: FunctionDeclaration = {
  name: "computeDistance",
  description: "Compute distance between two points.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      from: { type: SchemaType.STRING },
      to: { type: SchemaType.STRING },
    },
    required: ["from", "to"],
  },
};

export const fetchHotspotsTool: FunctionDeclaration = {
  name: "fetchHotspots",
  description: "Fetch popular hotspots for a domain/area.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      area: { type: SchemaType.STRING },
      domain: { type: SchemaType.STRING },
    },
  },
};

export const getAreaInfoTool: FunctionDeclaration = {
  name: "getAreaInfo",
  description: "Get summary info about an area.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      area: { type: SchemaType.STRING },
    },
    required: ["area"],
  },
};

export const showDirectionsToolDef: FunctionDeclaration = {
  name: "showDirections",
  description: "Get directions to a place (returns Google Maps link).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      destination: {
        type: SchemaType.STRING,
        description: "Place name or address to navigate to.",
      },
      lat: {
        type: SchemaType.NUMBER,
        description: "Optional latitude.",
      },
      lng: {
        type: SchemaType.NUMBER,
        description: "Optional longitude.",
      },
    },
    required: ["destination"],
  },
};
