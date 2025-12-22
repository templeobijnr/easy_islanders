import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase'; // Assuming shared config
import { Timestamp } from 'firebase-admin/firestore';

export const checkinExpiry = onSchedule('every 60 minutes', async (event) => {
    logger.info('⏳ Running check-in expiry cleanup...');

    const now = Timestamp.now();
    const checkinsRef = db.collection('checkins');

    // Query for expired check-ins
    const snapshot = await checkinsRef.where('expiresAt', '<', now).get();

    if (snapshot.empty) {
        logger.info('✅ No expired check-ins found.');
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`🗑️ Deleted ${snapshot.size} expired check-ins.`);
});
