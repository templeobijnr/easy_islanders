import * as functions from 'firebase-functions';
import { db } from '../config/firebase';
import * as repo from '../repositories/taxi.repository';
import { sendWhatsApp } from '../services/twilio.service';

/**
 * Scheduled function to check for expired taxi requests
 * Runs every 2 minutes
 */
export const checkTaxiRequestTimeouts = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        try {
            // Query pending requests older than 5 mins
            const snapshot = await db.collection('taxi_requests')
                .where('status', '==', 'pending')
                .where('createdAt', '<', fiveMinutesAgo)
                .get();

            console.log(`Found ${snapshot.size} expired taxi requests`);

            // Process each expired request
            const promises = snapshot.docs.map(async (doc) => {
                const data = doc.data();

                // Mark as expired
                await repo.markRequestExpired(doc.id);

                // Notify customer
                try {
                    await sendWhatsApp(
                        data.customerPhone,
                        `Sorry, no drivers are available at the moment. Please try again or consider pre-booking your ride.`
                    );
                } catch (error) {
                    console.error(`Failed to notify customer ${data.customerPhone}:`, error);
                }

                // Log for ops team monitoring
                console.log(`Request ${doc.id} expired - no driver assigned`);

                // Optional: Alert ops team
                // await alertOpsTeam(`Missed booking: ${doc.id}`);
            });

            await Promise.all(promises);

            console.log(`Processed ${promises.length} expired requests`);
        } catch (error) {
            console.error('Error checking taxi request timeouts:', error);
            throw error;
        }
    });

/**
 * Helper function to alert ops team (future implementation)
 */
/* Commented out until implemented
async function alertOpsTeam(message: string): Promise<void> {
  // TODO: Implement ops team alerting
  // Could be WhatsApp to admin, Slack webhook, email, etc.
  console.log(`OPS ALERT: ${message}`);
}
*/
