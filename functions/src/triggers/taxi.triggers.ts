import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import * as repo from "../repositories/taxi.repository";
import { sendWhatsApp } from "../services/twilio.service";

/**
 * Scheduled function to check for expired taxi requests
 * Runs every 2 minutes
 */
export const checkTaxiRequestTimeouts = onSchedule(
  {
    schedule: "every 2 minutes",
    region: "europe-west1",
    timeoutSeconds: 120,
  },
  async (event) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      // Query pending requests older than 5 mins
      const snapshot = await db
        .collection("taxi_requests")
        .where("status", "==", "pending")
        .where("createdAt", "<", fiveMinutesAgo)
        .get();

      logger.info(`Found ${snapshot.size} expired taxi requests`);

      // Process each expired request
      const promises = snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Mark as expired
        await repo.markRequestExpired(doc.id);

        // Notify customer
        if (
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_WHATSAPP_FROM
        ) {
          try {
            await sendWhatsApp(
              data.customerPhone,
              `Sorry, no drivers are available at the moment. Please try again or consider pre-booking your ride.`,
            );
          } catch (error) {
            logger.error(
              `Failed to notify customer ${data.customerPhone}:`,
              error,
            );
          }
        } else {
          logger.info(
            `Twilio not configured; skipping customer notification for request ${doc.id}`,
          );
        }

        // Log for ops team monitoring
        logger.info(`Request ${doc.id} expired - no driver assigned`);

        // Optional: Alert ops team
        // await alertOpsTeam(`Missed booking: ${doc.id}`);
      });

      await Promise.all(promises);

      logger.info(`Processed ${promises.length} expired requests`);
    } catch (error) {
      logger.error("Error checking taxi request timeouts:", error);
      throw error;
    }
  },
);

/**
 * Helper function to alert ops team (future implementation)
 */
/* Commented out until implemented
async function alertOpsTeam(message: string): Promise<void> {
  // TODO: Implement ops team alerting
  // Could be WhatsApp to admin, Slack webhook, email, etc.
  logger.debug(`OPS ALERT: ${message}`);
}
*/

// Export the status change trigger
export * from "./taxi-status.trigger";
