import * as logger from "firebase-functions/logger";
import { getErrorMessage } from "../../../utils/errors";
import { dispatchRepository } from "../dispatch/dispatch.repository";
import { webhookRepository } from "./webhook.repository";
import type { WebhookEventRecord, WebhookSignatureStatus } from "./webhook.types";
import { db } from "../../../config/firebase";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Map Twilio message status callbacks to DispatchMessage records.
 *
 * Determinism:
 * - providerEventId := `${MessageSid}:${MessageStatus}` (dedupe per status)
 * - If we cannot map MessageSid -> dispatchMessages.providerMessageId, quarantine.
 */
export async function processTwilioMessageStatus(input: {
  messageSid: string;
  status: string;
  to?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  signatureStatus: WebhookSignatureStatus;
  traceId: string;
}): Promise<{ processed: boolean; quarantined?: boolean }> {
  const providerEventId = `${input.messageSid}:${input.status}`;
  const eventId = `twilio:twilio_message_status:${providerEventId}`;

  const normalized = {
    messageSid: input.messageSid,
    status: input.status,
    to: input.to,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  };

  const event: WebhookEventRecord = {
    id: eventId,
    provider: "twilio",
    kind: "twilio_message_status",
    providerEventId,
    signatureStatus: input.signatureStatus,
    normalized,
    processed: false,
    traceId: input.traceId,
    createdAt: nowIso(),
  };

  // 1) Idempotent event write (fail-closed if cannot write)
  const { created } = await webhookRepository.createEventIfAbsent(event);
  if (!created) {
    return { processed: true };
  }

  // 2) Map to dispatch message by providerMessageId
  try {
    const snap = await db
      .collection("dispatchMessages")
      .where("providerMessageId", "==", input.messageSid)
      .limit(1)
      .get();

    if (snap.empty) {
      await webhookRepository.quarantine({
        provider: "twilio",
        kind: "twilio_message_status",
        providerEventId,
        signatureStatus: input.signatureStatus,
        normalized,
        reason: "UNKNOWN_PROVIDER_MESSAGE_ID",
        traceId: input.traceId,
      });
      await webhookRepository.markEventProcessed(eventId, {
        quarantined: true,
        quarantineReason: "UNKNOWN_PROVIDER_MESSAGE_ID",
      });
      return { processed: true, quarantined: true };
    }

    const dispatchDoc = snap.docs[0];
    const dispatchId = dispatchDoc.id; // idempotencyKey
    const dispatch = dispatchDoc.data() as any;

    // 3) Update dispatch record with last provider status (best-effort)
    await dispatchRepository.ref(dispatchId).update({
      lastProviderStatus: input.status,
      lastProviderStatusAt: nowIso(),
      providerErrorCode: input.errorCode || null,
      providerErrorMessage: input.errorMessage || null,
      updatedAt: nowIso(),
    } as any);

    // 4) Mark event processed + mapped
    await webhookRepository.markEventProcessed(eventId, {
      dispatchMessageId: dispatchId,
      jobId: dispatch.jobId,
      quarantined: false,
    });

    logger.info("[TwilioStatus] Mapped status", {
      traceId: input.traceId,
      messageSid: input.messageSid,
      status: input.status,
      dispatchMessageId: dispatchId,
      jobId: dispatch.jobId,
    });

    return { processed: true, quarantined: false };
  } catch (err: unknown) {
    logger.error("[TwilioStatus] Processing failed (fail-closed for transitions)", {
      traceId: input.traceId,
      error: getErrorMessage(err) || String(err),
      messageSid: input.messageSid,
      status: input.status,
    });
    // We do NOT retry side effects here; event is stored and will require replay tooling if needed.
    // Mark as processed=false so a reprocessor can pick it up.
    return { processed: false };
  }
}




