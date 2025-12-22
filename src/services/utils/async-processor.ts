/**
 * ⚠ DEV-ONLY SIMULATION SERVICE
 *
 * This service simulates backend workers for local development:
 * - Booking state machine transitions
 * - Notification generation
 * - Social activity simulation
 *
 * PRODUCTION: This code DOES NOT RUN in production.
 * It is guarded by `if (!import.meta.env.DEV) return;` in App.tsx.
 *
 * REMOVAL: Delete this file when backend Cloud Functions handle:
 * - Booking status webhooks
 * - Push notifications
 * - Activity feeds
 */

import { logger } from "@/utils/logger";
import { StorageService } from "../infrastructure/storage/local-storage.service";
import { Booking, UserNotification } from "../../types";
import { MOCK_HOT_ZONES } from "../../components/constants";
import { auth } from "../firebaseConfig";

class AsyncProcessorService {
  private intervalIds: NodeJS.Timeout[] = [];
  private isRunning = false;

  init() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.debug("🔄 Async Processor Started (Simulating Backend Workers)");

    // 1. Booking Pipeline Worker (Runs every 5s)
    this.intervalIds.push(setInterval(this.processBookingQueue, 5000));

    // 2. Vibe Map Decay Worker (Runs every 30s)
    this.intervalIds.push(setInterval(this.processVibeDynamics, 30000));

    // 3. Social Activity Simulator (Runs every 45s)
    this.intervalIds.push(setInterval(this.simulateSocialActivity, 45000));
  }

  /**
   * start() — canonical entrypoint used by app bootstrapping.
   *
   * This service is dev-only simulation. In production builds, this is a no-op.
   */
  start() {
    // PRODUCTION: do not run simulated workers outside dev.
    if (!import.meta.env.DEV) return;
    this.init();
  }

  stop() {
    this.intervalIds.forEach(clearInterval);
    this.intervalIds = [];
    this.isRunning = false;
  }

  // Check if user is authenticated before making Firebase calls
  private isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  // --- TASK: Booking State Machine ---
  // Simulates Payment Gateway Webhooks and Agent Approvals
  private processBookingQueue = async () => {
    // Skip if not authenticated
    if (!this.isAuthenticated()) return;

    try {
      const bookings = await StorageService.getUserBookings();
      let hasChanges = false;

      for (const booking of bookings) {
        // Scenario A: Payment Pending -> Confirmed (Simulate Stripe Success)
        if (booking.status === "payment_pending") {
          if (Math.random() > 0.3) {
            booking.status = "confirmed";
            await StorageService.saveBooking(booking);
            this.sendNotification(
              booking.id,
              "Booking Confirmed",
              `Your booking for ${booking.itemTitle} is confirmed! Check your email for the receipt.`,
              "booking",
            );
            hasChanges = true;
          }
        }

        // Scenario B: Viewing Requested -> Viewing Confirmed (Simulate Agent Approval)
        if (booking.status === "viewing_requested") {
          if (Math.random() > 0.5) {
            booking.status = "viewing_confirmed";
            await StorageService.saveBooking(booking);
            this.sendNotification(
              booking.id,
              "Viewing Approved",
              `Good news! The owner has confirmed your viewing for ${booking.itemTitle}.`,
              "booking",
            );
            hasChanges = true;
          }
        }

        // Scenario C: Taxi Dispatched -> Driver Arrived
        if (booking.status === "taxi_dispatched") {
          if (Math.random() > 0.7) {
            this.sendNotification(
              booking.id,
              "Driver Arriving",
              `Your driver ${booking.driverDetails?.name} is 1 minute away.`,
              "system",
            );
          }
        }
      }

      if (hasChanges) {
        logger.debug("🔄 [AsyncProcessor] Processed Booking Queue updates.");
      }
    } catch (error) {
      // Silently fail - this is just a background simulation
    }
  };

  // --- TASK: Vibe Map Dynamics ---
  private processVibeDynamics = async () => {
    // Skip if not authenticated
    if (!this.isAuthenticated()) return;

    try {
      const randomZone =
        MOCK_HOT_ZONES[Math.floor(Math.random() * MOCK_HOT_ZONES.length)];
      if (Math.random() > 0.7) {
        this.sendNotification(
          "trend-" + Date.now(),
          "Trending Nearby",
          `${randomZone.name} is getting busy! ${randomZone.activeCount + 5} islanders are there right now.`,
          "social",
        );
      }
    } catch (error) {
      // Silently fail
    }
  };

  // --- TASK: Social Simulation ---
  private simulateSocialActivity = async () => {
    // Skip if not authenticated
    if (!this.isAuthenticated()) return;

    try {
      const posts = await StorageService.getSocialPosts();
      const myPosts = posts.filter((p) => p.author.id === "me");

      if (myPosts.length > 0 && Math.random() > 0.6) {
        const post = myPosts[0];
        post.likes += 1;
        await StorageService.saveSocialPost(post);
        this.sendNotification(
          "like-" + Date.now(),
          "New Vouch",
          `Someone vouched for your post about ${post.location || "island life"}.`,
          "social",
        );
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Helper to push notification
  private sendNotification(
    id: string,
    title: string,
    message: string,
    type: "booking" | "social" | "system" | "promotion",
  ) {
    if (!this.isAuthenticated()) return;

    const notif: UserNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: "me",
      type,
      title,
      message,
      read: false,
      timestamp: new Date().toISOString(),
    };
    StorageService.saveNotification(notif);
  }
}

export const AsyncProcessor = new AsyncProcessorService();

/**
 * asyncProcessor — canonical stable API (preferred import).
 * Keep this as a thin wrapper so refactors don't break call sites.
 */
export const asyncProcessor = {
  start: () => AsyncProcessor.start(),
  stop: () => AsyncProcessor.stop(),
} as const;
