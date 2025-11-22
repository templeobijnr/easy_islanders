import { db } from '../config/firebase';

export const memoryService = {
    // Call this in the background
    updateLongTermMemory: async (userId: string, recentMessages: any[]) => {
        // 1. Ask Gemini to extract facts from these specific messages
        // Prompt: "Extract user preferences (budget, location, likes) from this conversation snippet..."

        // 2. Merge results into Firestore 'users/{userId}/memory'
        // Use set({ ...data }, { merge: true })

        // Placeholder for now
        console.log(`[MemoryService] Would update memory for ${userId}`);
    },

    // Call this when building the System Prompt
    getContext: async (userId: string) => {
        const doc = await db.collection('users').doc(userId).collection('memory').doc('main').get();
        return doc.data() || {};
    }
};
