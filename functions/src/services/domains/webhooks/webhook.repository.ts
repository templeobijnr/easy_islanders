import { db } from "../../../config/firebase";
import { WebhookEventRecord, WebhookQuarantineRecord } from "./webhook.types";

const EVENTS = "webhookEvents";
const QUARANTINE = "webhookQuarantine";

function nowIso(): string {
  return new Date().toISOString();
}

export const webhookRepository = {
  /**
   * Idempotent create: returns { created: false } if already exists.
   * Fail-closed: if txn fails, throw.
   */
  async createEventIfAbsent(event: WebhookEventRecord): Promise<{ created: boolean; existing?: WebhookEventRecord }> {
    const ref = db.collection(EVENTS).doc(event.id);
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (doc.exists) {
        return { created: false, existing: doc.data() as WebhookEventRecord };
      }
      tx.set(ref, event);
      return { created: true };
    });
  },

  async markEventProcessed(eventId: string, patch: Partial<WebhookEventRecord>): Promise<void> {
    await db.collection(EVENTS).doc(eventId).update({
      ...patch,
      processed: true,
    });
  },

  async quarantine(input: Omit<WebhookQuarantineRecord, "id" | "createdAt">): Promise<WebhookQuarantineRecord> {
    const id = `${input.provider}:${input.kind}:${input.providerEventId}:${Date.now()}`;
    const record: WebhookQuarantineRecord = { ...input, id, createdAt: nowIso() };
    await db.collection(QUARANTINE).doc(id).set(record);
    return record;
  },
};




