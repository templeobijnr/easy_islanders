export type DispatchChannel = "whatsapp";

export type DispatchKind = "job_dispatch" | "user_notification";

export type DispatchStatus = "reserved" | "sending" | "sent" | "failed";

export interface DispatchMessageRecord {
  /**
   * Firestore doc id. Deterministic: use idempotencyKey.
   */
  id: string;

  kind: DispatchKind;
  channel: DispatchChannel;

  /**
   * Optional: canonical linkage when dispatch is job-related.
   */
  jobId?: string;

  /**
   * Optional: thread linkage when dispatch is user-facing.
   */
  threadId?: string;

  /**
   * Who/what this dispatch is correlated to (jobId, notificationIdempotencyKey, etc.)
   */
  correlationId: string;

  /**
   * Deterministic idempotency key for this outbound provider send.
   */
  idempotencyKey: string;

  /**
   * Provider address (E.164)
   */
  toE164: string;

  /**
   * Rendered message body (exact bytes sent to provider)
   */
  body: string;

  /**
   * Provider message identifier (Twilio SID) once sent.
   */
  providerMessageId?: string;

  status: DispatchStatus;
  attempts: number;
  lastAttemptId?: string;
  lastError?: string;

  traceId: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
}


