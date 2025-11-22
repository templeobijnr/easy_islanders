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
    getContext: async (userId) => {
        const doc = await firebase_1.db.collection('users').doc(userId).collection('memory').doc('main').get();
        return doc.data() || {};
    }
};
//# sourceMappingURL=memory.service.js.map