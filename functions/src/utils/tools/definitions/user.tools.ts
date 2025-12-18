import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const getUserProfileTool: FunctionDeclaration = {
  name: "getUserProfile",
  description: "Fetch the current user profile to personalize responses.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const updateUserProfileTool: FunctionDeclaration = {
  name: "updateUserProfile",
  description:
    "Update user profile/preferences (persona, interests, budget, location).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      persona: { type: SchemaType.STRING },
      interests: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      budget: { type: SchemaType.NUMBER },
      location: { type: SchemaType.STRING },
    },
  },
};

export const saveFavoriteItemTool: FunctionDeclaration = {
  name: "saveFavoriteItem",
  description: "Save an item (listing/place/event) to user favorites.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      itemId: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      domain: { type: SchemaType.STRING },
    },
    required: ["itemId", "title"],
  },
};

export const listFavoritesTool: FunctionDeclaration = {
  name: "listFavorites",
  description: "List user favorites to reuse context.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
