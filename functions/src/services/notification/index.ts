/**
 * Notification Service
 *
 * Orchestrates job notifications across multiple channels.
 *
 * Channel priority:
 * 1. Push (fastest, but requires app installation)
 * 2. WhatsApp (reliable, universal)
 * 3. SMS (future fallback)
 *
 * Design principles:
 * - Each channel is independent and testable
 * - Adding a new channel = create one file, add to channels array
 * - Failures are logged and fallback to next channel
 */

import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import type { Job, MerchantTarget } from "@askmerve/shared";
import {
  WhatsAppNotificationChannel,
  PushNotificationChannel,
} from "./channels";
import type {
  NotificationChannel,
  NotificationDispatchResult,
  NotificationOptions,
} from "./notification.types";

// Re-export types for consumers
export * from "./notification.types";

// =============================================================================
// SERVICE
// =============================================================================

export class NotificationService {
  /**
   * Ordered list of channels to try.
   * First available channel that succeeds wins.
   */
  private readonly channels: NotificationChannel[];

  constructor() {
    this.channels = [
      new PushNotificationChannel(), // Try push first (will fail for now)
      new WhatsAppNotificationChannel(), // WhatsApp fallback (always works)
      // Future: SMSNotificationChannel
    ];
  }

  /**
   * Send a job notification to the merchant.
   *
   * Tries channels in priority order until one succeeds.
   * Logs failures and continues to next channel.
   *
   * @param job - The job being dispatched
   * @param merchantTarget - Where to send notification
   * @param merchantPhone - Resolved phone number (for listed merchants)
   */
  async sendJobNotification(
    job: Job,
    merchantTarget: MerchantTarget,
    merchantPhone?: string,
  ): Promise<NotificationDispatchResult> {
    const failures: NotificationDispatchResult["failures"] = [];

    // Check if merchant has app installed (for CTA decision)
    const merchantHasAppInstalled =
      await this.checkMerchantHasApp(merchantTarget);

    // Build notification options
    const options: NotificationOptions = {
      includeAppDownloadCta: !merchantHasAppInstalled,
      urgency: "high", // Jobs are time-sensitive
    };

    // Resolve target for WhatsApp (inject phone if listed)
    const resolvedTarget = this.resolveTarget(merchantTarget, merchantPhone);

    // Try each channel in order
    for (const channel of this.channels) {
      const channelName = channel.name;

      // Check availability
      const isAvailable = await channel.isAvailable(resolvedTarget);
      if (!isAvailable) {
        logger.debug(
          `[NotificationService] ${channelName} not available for merchant`,
        );
        continue;
      }

      // Attempt send
      logger.debug(
        `[NotificationService] Attempting ${channelName} for job ${job.id}`,
      );
      const result = await channel.send(job, resolvedTarget, options);

      if (result.success) {
        logger.debug(`[NotificationService] ${channelName} succeeded`, {
          jobId: job.id,
          messageId: result.messageId,
        });

        return {
          success: true,
          channel: channelName,
          messageId: result.messageId,
          failures: failures.length > 0 ? failures : undefined,
        };
      }

      // Log failure and continue
      console.warn(`[NotificationService] ${channelName} failed`, {
        jobId: job.id,
        reason: result.failureReason,
      });

      failures.push({
        channel: channelName,
        reason: result.failureReason || "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }

    // All channels failed
    console.error(
      `[NotificationService] All channels failed for job ${job.id}`,
      {
        failures,
      },
    );

    return {
      success: false,
      channel: "none",
      messageId: "",
      error: "All notification channels failed",
      failures,
    };
  }

  /**
   * Check if merchant has the app installed.
   *
   * TODO (Sprint 3):
   * - Look up merchant profile in Firestore
   * - Check fcmTokens array
   */
  private async checkMerchantHasApp(
    _merchantTarget: MerchantTarget,
  ): Promise<boolean> {
    // Not implemented yet - assume no app
    return false;
  }

  /**
   * Resolve merchant target with phone number for WhatsApp.
   *
   * For unlisted merchants, phone is already in the target.
   * For listed merchants, phone must be passed separately (after lookup).
   */
  private resolveTarget(
    merchantTarget: MerchantTarget,
    merchantPhone?: string,
  ): MerchantTarget {
    if (merchantTarget.type === "unlisted") {
      return merchantTarget;
    }

    // For listed merchants with a resolved phone, we need to
    // pass the phone to the WhatsApp channel somehow.
    // For now, the WhatsApp channel only handles unlisted directly.
    // Listed merchant dispatch happens at a higher level.
    return merchantTarget;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _instance: NotificationService | null = null;

/**
 * Get the NotificationService singleton.
 */
export function getNotificationService(): NotificationService {
  if (!_instance) {
    _instance = new NotificationService();
  }
  return _instance;
}
