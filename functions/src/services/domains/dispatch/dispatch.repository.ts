import { db } from "../../../config/firebase";
import { DispatchMessageRecord } from "./dispatch.types";

const COLLECTION = "dispatchMessages";

export type ReserveResult =
  | { canSend: true; record: DispatchMessageRecord }
  | { canSend: false; record: DispatchMessageRecord };

function nowIso(): string {
  return new Date().toISOString();
}

export const dispatchRepository = {
  ref(id: string) {
    return db.collection(COLLECTION).doc(id);
  },

  async get(id: string): Promise<DispatchMessageRecord | null> {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as DispatchMessageRecord;
  },

  /**
   * Reserve/claim a dispatch for sending (fail-closed if transaction fails).
   * Deterministic doc id = idempotencyKey.
   */
  async reserveForSend(params: {
    idempotencyKey: string;
    createIfMissing: Omit<DispatchMessageRecord, "status" | "attempts" | "createdAt" | "updatedAt">;
    attemptId: string;
    maxAttempts: number;
  }): Promise<ReserveResult> {
    const { idempotencyKey, createIfMissing, attemptId, maxAttempts } = params;
    const ref = db.collection(COLLECTION).doc(idempotencyKey);

    return db.runTransaction(async (tx) => {
      const now = nowIso();
      const doc = await tx.get(ref);

      if (!doc.exists) {
        const record: DispatchMessageRecord = {
          ...createIfMissing,
          id: idempotencyKey,
          idempotencyKey,
          status: "sending",
          attempts: 1,
          lastAttemptId: attemptId,
          createdAt: now,
          updatedAt: now,
        };
        tx.set(ref, record);
        return { canSend: true, record };
      }

      const existing = doc.data() as DispatchMessageRecord;

      // Terminal: already sent
      if (existing.status === "sent") {
        return { canSend: false, record: existing };
      }

      // Idempotent: same attemptId already claimed
      if (existing.lastAttemptId === attemptId) {
        return { canSend: false, record: existing };
      }

      // Max attempts exceeded => fail-closed (no more sends)
      if ((existing.attempts || 0) >= maxAttempts) {
        const patched: DispatchMessageRecord = {
          ...existing,
          status: "failed",
          lastError: existing.lastError || "Max attempts exceeded",
          updatedAt: now,
        };
        tx.update(ref, patched as any);
        return { canSend: false, record: patched };
      }

      // Claim for send
      const patched: DispatchMessageRecord = {
        ...existing,
        status: "sending",
        attempts: (existing.attempts || 0) + 1,
        lastAttemptId: attemptId,
        updatedAt: now,
      };
      tx.update(ref, patched as any);
      return { canSend: true, record: patched };
    });
  },

  async markSent(idempotencyKey: string, patch: { providerMessageId: string }): Promise<void> {
    const now = nowIso();
    await db.collection(COLLECTION).doc(idempotencyKey).update({
      status: "sent",
      providerMessageId: patch.providerMessageId,
      lastError: null,
      updatedAt: now,
    });
  },

  async markFailed(idempotencyKey: string, error: string): Promise<void> {
    const now = nowIso();
    await db.collection(COLLECTION).doc(idempotencyKey).update({
      status: "failed",
      lastError: error,
      updatedAt: now,
    });
  },
};




