import { onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// This is a callable function if we want to trigger it from client securely,
// OR we could make it a Firestore trigger on a 'waves' collection.
// For V1, the spec says "console log" is enough, but let's provide the structure.

export const wave = onCall(async (request) => {
    const { pinId, userDisplayName } = request.data;

    if (!request.auth) {
        throw new Error('Unauthenticated');
    }

    logger.info(`👋 ${userDisplayName || 'User'} waved at pin ${pinId}`);

    // Logic to send FCM to checked-in users would go here
    return { success: true };
});
