export type WebhookProvider = "twilio";

export type WebhookSignatureStatus = "verified" | "invalid" | "missing_secret";

export type WebhookEventKind = "twilio_message_status";

export interface WebhookEventRecord {
  /**
   * Deterministic doc id: `${provider}:${kind}:${providerEventId}`
   */
  id: string;
  provider: WebhookProvider;
  kind: WebhookEventKind;

  /**
   * Provider unique-ish event id (for Twilio status callbacks, we use `${messageSid}:${status}`).
   */
  providerEventId: string;

  signatureStatus: WebhookSignatureStatus;

  /**
   * Normalized payload stored for evidence/debug.
   */
  normalized: Record<string, unknown>;

  /**
   * Correlation once mapped.
   */
  dispatchMessageId?: string; // dispatchMessages doc id (idempotencyKey)
  jobId?: string;

  /**
   * Processing outcome
   */
  processed: boolean;
  quarantined?: boolean;
  quarantineReason?: string;

  traceId: string;
  createdAt: string; // ISO
}

export interface WebhookQuarantineRecord {
  id: string;
  provider: WebhookProvider;
  kind: WebhookEventKind;
  providerEventId: string;
  signatureStatus: WebhookSignatureStatus;
  normalized: Record<string, unknown>;
  reason: string;
  traceId: string;
  createdAt: string; // ISO
}




