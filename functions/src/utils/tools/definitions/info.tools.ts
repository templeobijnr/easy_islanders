import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const consultEncyclopediaTool: FunctionDeclaration = {
  name: "consultEncyclopedia",
  description:
    "Get answers about local laws, residency, utilities, and culture.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: "The topic to look up." },
    },
    required: ["query"],
  },
};

export const getRealTimeInfoTool: FunctionDeclaration = {
  name: "getRealTimeInfo",
  description: "Get current weather, exchange rates, or local news.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        description: '"weather", "currency", "news"',
      },
    },
    required: ["category"],
  },
};
