import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const createTribeTool: FunctionDeclaration = {
  name: "createTribe",
  description: "Create a new tribe/community.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["name"],
  },
};

export const joinTribeTool: FunctionDeclaration = {
  name: "joinTribe",
  description: "Join a tribe by ID.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tribeId: { type: SchemaType.STRING },
    },
    required: ["tribeId"],
  },
};

export const leaveTribeTool: FunctionDeclaration = {
  name: "leaveTribe",
  description: "Leave a tribe by ID.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tribeId: { type: SchemaType.STRING },
    },
    required: ["tribeId"],
  },
};

export const postToTribeTool: FunctionDeclaration = {
  name: "postToTribe",
  description: "Create a post inside a tribe.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tribeId: { type: SchemaType.STRING },
      content: { type: SchemaType.STRING },
      mediaUrl: { type: SchemaType.STRING },
    },
    required: ["tribeId", "content"],
  },
};

export const listTribeMessagesTool: FunctionDeclaration = {
  name: "listTribeMessages",
  description: "List recent posts/messages in a tribe.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tribeId: { type: SchemaType.STRING },
      limit: { type: SchemaType.NUMBER },
    },
    required: ["tribeId"],
  },
};

export const getTribeInfoTool: FunctionDeclaration = {
  name: "getTribeInfo",
  description: "Get tribe details.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tribeId: { type: SchemaType.STRING },
    },
    required: ["tribeId"],
  },
};

export const listTrendingTribesTool: FunctionDeclaration = {
  name: "listTrendingTribes",
  description: "List trending tribes.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      limit: { type: SchemaType.NUMBER },
    },
  },
};
