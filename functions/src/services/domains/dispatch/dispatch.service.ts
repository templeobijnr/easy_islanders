import * as logger from "firebase-functions/logger";
import { getErrorMessage } from "../../../utils/errors";
import { dispatchRepository } from "./dispatch.repository";
import { DispatchKind, DispatchMessageRecord } from "./dispatch.types";

export class RetryableSideEffectError extends Error {
  public readonly retryable = true;
  constructor(message: string) {
    super(message);
    this.name = "RetryableSideEffectError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function requireE164(value: string, field: string): void {
  if (!value || typeof value !== "string" || !value.match(/^\+\d{10,15}$/)) {
    throw new Error(`DispatchService: ${field} must be E.164 (+##########)`);
  }
}

export const DispatchService = {
  /**
   * Canonical write-before-send WhatsApp dispatch.
   *
   * Fail-closed:
   * - If we cannot reserve the DispatchMessage record, we do not call provider.
   * - If the record indicates already-sent, we do not call provider.
   */
  async sendWhatsApp(params: {
    kind: DispatchKind;
    toE164: string;
    body: string;
    correlationId: string;
    idempotencyKey: string;
    traceId: string;
    jobId?: string;
    threadId?: string;
    /**
     * For unit testing / dependency injection.
     */
    sendFn?: (toE164: string, body: string) => Promise<{ sid: string }>;
  }): Promise<DispatchMessageRecord> {
    const { kind, toE164, body, correlationId, idempotencyKey, traceId } = params;
    requireE164(toE164, "toE164");
    if (!body) throw new Error("DispatchService: body is required");
    if (!correlationId) throw new Error("DispatchService: correlationId is required");
    if (!idempotencyKey) throw new Error("DispatchService: idempotencyKey is required");
    if (!traceId) throw new Error("DispatchService: traceId is required");

    const attemptId = `${traceId}:${Date.now()}`;

    // 1) Reserve/claim record (fail-closed if this fails)
    let reserved;
    try {
      reserved = await dispatchRepository.reserveForSend({
        idempotencyKey,
        attemptId,
        maxAttempts: 5,
        createIfMissing: {
          id: idempotencyKey,
          kind,
          channel: "whatsapp",
          jobId: params.jobId,
          threadId: params.threadId,
          correlationId,
          idempotencyKey,
          toE164,
          body,
          traceId,
          attempts: 0,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        } as any,
      });
    } catch (err: unknown) {
      logger.error("[DispatchService] Reserve failed (fail-closed)", {
        traceId,
        idempotencyKey,
        error: getErrorMessage(err) || String(err),
      });
      throw new RetryableSideEffectError("Dispatch reserve failed; retry later");
    }

    if (!reserved.canSend) {
      return reserved.record;
    }

    // 2) Call provider ONLY after record exists
    const send = params.sendFn
      ? params.sendFn
      : async (to: string, msg: string) => {
          const { sendWhatsApp } = await import("../../twilio.service");
          const r = await sendWhatsApp(to, msg);
          return { sid: r.sid };
        };

    try {
      const result = await send(toE164, body);
      await dispatchRepository.markSent(idempotencyKey, { providerMessageId: result.sid });
      const updated = await dispatchRepository.get(idempotencyKey);
      if (!updated) throw new Error("Dispatch record missing after markSent");
      return updated;
    } catch (err: unknown) {
      const msg = getErrorMessage(err) || "Provider send failed";
      logger.error("[DispatchService] Provider send failed", { traceId, idempotencyKey, error: msg });
      // Mark failed so it is visible + retryable; reserveForSend will allow retry with new attemptId.
      try {
        await dispatchRepository.markFailed(idempotencyKey, msg);
      } catch (markErr: unknown) {
        // Fail-closed principle still holds for future retries: record exists (sending/failed) so we won't double-send.
        logger.error("[DispatchService] Failed to mark dispatch as failed", {
          traceId,
          idempotencyKey,
          error: getErrorMessage(markErr) || String(markErr),
        });
      }
      throw new RetryableSideEffectError(msg);
    }
  },
};


