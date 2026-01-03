/**
 * emitUserEvent (thread-first)
 *
 * Purpose:
 * - Provide a single, deterministic API to record a significant user-facing event.
 *
 * Invariants:
 * - Threads are canonical source of truth (write thread message first).
 * - Fail-closed defaults: if required identifiers are missing, throw.
 * - Idempotent: same (threadId,eventType,correlationId) produces exactly one thread message
 *   and at most one notification.
 * - No module-scope side effects.
 *
 * Notes:
 * - For V1 we default to **in_app** notifications only.
 *   WhatsApp is treated as the chat channel itself (avoid double-send spam).
 */

import type { NotificationType, NotificationChannel } from "../../../modules/notifications/notifications.schema";
import { NotificationsController } from "../../../modules/notifications/notifications.controller";
import { appendMessage } from "../conversations/thread.repository";

export type EmitUserEventInput = {
  threadId: string;
  userId: string;
  eventType: NotificationType;
  /**
   * Canonical, user-facing message recorded in the thread as a system message.
   */
  threadText: string;
  /**
   * Correlation to a domain entity (jobId/bookingId/requestId/etc).
   * REQUIRED for all non-"general" event types.
   */
  correlationId?: string;
  /**
   * Optional metadata, stored on the notification record (not used for routing).
   */
  metadata?: Record<string, unknown>;
  /**
   * Override notification channels.
   * V1 default is ["in_app"].
   */
  channels?: NotificationChannel[];
  /**
   * Override idempotency key used for both thread message and notification.
   * If omitted, derived from (threadId,eventType,correlationId|general).
   */
  idempotencyKey?: string;
};

function requireCorrelationId(eventType: NotificationType, correlationId?: string): void {
  if (eventType === "general") return;
  if (!correlationId) {
    throw new Error(`emitUserEvent: correlationId is required for eventType='${eventType}'`);
  }
}

function deriveEventIdempotencyKey(input: {
  threadId: string;
  eventType: NotificationType;
  correlationId?: string;
}): string {
  const corr = input.correlationId || "general";
  return `evt:${input.threadId}:${input.eventType}:${corr}`;
}

export async function emitUserEvent(input: EmitUserEventInput): Promise<void> {
  if (!input.threadId) throw new Error("emitUserEvent: threadId is required");
  if (!input.userId) throw new Error("emitUserEvent: userId is required");
  if (!input.eventType) throw new Error("emitUserEvent: eventType is required");
  if (!input.threadText) throw new Error("emitUserEvent: threadText is required");

  requireCorrelationId(input.eventType, input.correlationId);

  const idempotencyKey =
    input.idempotencyKey ||
    deriveEventIdempotencyKey({
      threadId: input.threadId,
      eventType: input.eventType,
      correlationId: input.correlationId,
    });

  // 1) Canonical thread write (system message). Idempotent via channelMessageId.
  await appendMessage({
    threadId: input.threadId,
    direction: "outbound",
    role: "system",
    actorId: "system",
    channel: "app",
    channelMessageId: idempotencyKey,
    text: input.threadText,
    metadata: {
      eventType: input.eventType,
      correlationId: input.correlationId,
      idempotencyKey,
      ...(input.metadata || {}),
    },
  });

  // 2) Secondary notification (V1 default: in_app only)
  await NotificationsController.createAndSend({
    userId: input.userId,
    type: input.eventType,
    title: "Update",
    body: input.threadText,
    correlationId: input.correlationId || input.threadId,
    metadata: input.metadata,
    channels: input.channels || ["in_app"],
    idempotencyKey,
  });
}




