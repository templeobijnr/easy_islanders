import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const createConsumerRequestTool: FunctionDeclaration = {
  name: "createConsumerRequest",
  description:
    "Create a general request for items not found in the marketplace.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      requestDetails: { type: SchemaType.STRING },
      contactInfo: { type: SchemaType.STRING },
    },
    required: ["requestDetails", "contactInfo"],
  },
};
