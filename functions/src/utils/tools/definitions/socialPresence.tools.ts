import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const waveUserTool: FunctionDeclaration = {
  name: "waveUser",
  description: "Send a wave to another user.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetUserId: { type: SchemaType.STRING },
    },
    required: ["targetUserId"],
  },
};

export const acceptWaveTool: FunctionDeclaration = {
  name: "acceptWave",
  description: "Accept a wave request.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      waveId: { type: SchemaType.STRING },
    },
    required: ["waveId"],
  },
};

export const listNearbyUsersTool: FunctionDeclaration = {
  name: "listNearbyUsers",
  description: "List nearby users for social discovery.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: { type: SchemaType.STRING },
    },
  },
};

export const checkInToPlaceTool: FunctionDeclaration = {
  name: "checkInToPlace",
  description: "Create a check-in to a place.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      placeId: { type: SchemaType.STRING },
      placeName: { type: SchemaType.STRING },
      location: { type: SchemaType.STRING },
    },
    required: ["placeId", "placeName"],
  },
};

export const getCheckInsForPlaceTool: FunctionDeclaration = {
  name: "getCheckInsForPlace",
  description: "Fetch recent check-ins for a place.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      placeId: { type: SchemaType.STRING },
      limit: { type: SchemaType.NUMBER },
    },
    required: ["placeId"],
  },
};

export const fetchVibeMapDataTool: FunctionDeclaration = {
  name: "fetchVibeMapData",
  description: "Fetch vibe map data for areas.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      area: { type: SchemaType.STRING },
    },
  },
};
