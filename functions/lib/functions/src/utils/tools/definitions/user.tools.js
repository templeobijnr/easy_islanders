"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFavoritesTool = exports.saveFavoriteItemTool = exports.updateUserProfileTool = exports.getUserProfileTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.getUserProfileTool = {
    name: "getUserProfile",
    description: "Fetch the current user profile to personalize responses.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {},
    },
};
exports.updateUserProfileTool = {
    name: "updateUserProfile",
    description: "Update user profile/preferences (persona, interests, budget, location).",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            persona: { type: generative_ai_1.SchemaType.STRING },
            interests: { type: generative_ai_1.SchemaType.ARRAY, items: { type: generative_ai_1.SchemaType.STRING } },
            budget: { type: generative_ai_1.SchemaType.NUMBER },
            location: { type: generative_ai_1.SchemaType.STRING },
        },
    },
};
exports.saveFavoriteItemTool = {
    name: "saveFavoriteItem",
    description: "Save an item (listing/place/event) to user favorites.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itemId: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["itemId", "title"],
    },
};
exports.listFavoritesTool = {
    name: "listFavorites",
    description: "List user favorites to reuse context.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {},
    },
};
//# sourceMappingURL=user.tools.js.map