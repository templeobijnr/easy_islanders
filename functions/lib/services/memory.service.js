"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryService = void 0;
const firebase_1 = require("../config/firebase");
exports.memoryService = {
    // Call this in the background
    updateLongTermMemory: async (userId, recentMessages) => {
        // 1. Ask Gemini to extract facts from these specific messages
        // Prompt: "Extract user preferences (budget, location, likes) from this conversation snippet..."
        // 2. Merge results into Firestore 'users/{userId}/memory'
        // Use set({ ...data }, { merge: true })
        // Placeholder for now
        console.log(`[MemoryService] Would update memory for ${userId}`);
    },
    // Call this when building the System Prompt
    getContext: async (userId, agentId) => {
        const doc = await firebase_1.db.collection('users').doc(userId).collection('memory').doc('main').get();
        const full = doc.data() || {};
        // 1. Core Context (Always Needed)
        const core = {
            name: full.name || null,
            style: full.style || null, // e.g. "Direct", "Polite"
        };
        // 2. Domain Slicing
        let slice = {};
        switch (agentId) {
            case 'agent_estate':
                slice = {
                    budget: full.budget,
                    preferredAreas: full.preferredAreas,
                    propertyType: full.propertyType,
                    investmentIntent: full.investmentIntent
                };
                break;
            case 'agent_auto':
                slice = {
                    carPreference: full.carPreference,
                    licenseType: full.licenseType
                };
                break;
            case 'agent_gourmet':
                slice = {
                    dietaryRestrictions: full.dietaryRestrictions,
                    favoriteCuisines: full.favoriteCuisines,
                    diningBudget: full.diningBudget
                };
                break;
            default:
                // Fallback: Return a bit more for general concierge
                slice = {
                    interests: full.interests,
                    familySize: full.familySize
                };
        }
        // Remove null/undefined keys to save tokens
        const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
        return Object.assign(Object.assign({}, clean(core)), clean(slice));
    }
};
//# sourceMappingURL=memory.service.js.map