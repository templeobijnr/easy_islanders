import { db } from '../../config/firebase';
import * as logger from 'firebase-functions/logger';

export const memoryService = {
    // Call this in the background
    updateLongTermMemory: async (userId: string, recentMessages: any[]) => {
        // 1. Ask Gemini to extract facts from these specific messages
        // Prompt: "Extract user preferences (budget, location, likes) from this conversation snippet..."

        // 2. Merge results into Firestore 'users/{userId}/memory'
        // Use set({ ...data }, { merge: true })

        // Placeholder for now
        logger.info(`[MemoryService] Would update memory for ${userId}`);
    },

    // Extract facts and update memory (Background Task, Sampled)
    extractAndPersist: async (userId: string, agentId: string | undefined, userMessage: string, modelResponse: string) => {
        // SAMPLING: Only process 20% of turns to save cost, or if message is long/rich
        const shouldProcess = Math.random() < 0.2 || userMessage.length > 50;

        if (!shouldProcess) {
            return;
        }

        try {
            // 1. Ask Gemini to extract facts
            // Ideally this would be a separate smaller model or specialized prompt
            // For now, we stub it to avoid the crash.
            logger.info(`[MemoryService] extracting facts for ${userId} (Sampled)`);

            // In a real implementation:
            // const newFacts = await gemini.extractFacts(userMessage);
            // await db.collection('users').doc(userId).collection('memory').doc('main').set(newFacts, { merge: true });

            // Forward to the bulk update method for now (simulated)
            await memoryService.updateLongTermMemory(userId, [
                { role: 'user', text: userMessage },
                { role: 'model', text: modelResponse }
            ]);

        } catch (error) {
            logger.error('[MemoryService] Extraction failed', error);
        }
    },

    // Call this when building the System Prompt
    getContext: async (userId: string, agentId?: string) => {
        const doc = await db.collection('users').doc(userId).collection('memory').doc('main').get();
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
        const clean = (obj: any) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));

        return { ...clean(core), ...clean(slice) };
    }
};

