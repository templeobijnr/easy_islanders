import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';

export const onEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();

    // If created by a user (not admin), ensure approved is false
    // We assume admins might set approved=true directly, but let's enforce false for safety if needed.
    // Actually, the client should set approved=false, but we can enforce it here or send a notification.

    if (data.approved === false) {
        logger.info(`📝 New unapproved event created: ${data.title} (${event.params.eventId})`);
        // TODO: Send notification to admin
    }
});
