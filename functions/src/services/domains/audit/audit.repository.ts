import { db } from "../../../config/firebase";
import { AuditEventRecord } from "./audit.types";

function nowIso(): string {
  return new Date().toISOString();
}

export const auditRepository = {
  /**
   * Append audit event under jobs/{jobId}/auditEvents/{eventId}.
   * If idempotencyKey is provided, eventId should be deterministic to dedupe.
   */
  async appendJobAudit(jobId: string, event: Omit<AuditEventRecord, "entityType" | "entityId" | "createdAt">) {
    const record: AuditEventRecord = {
      ...event,
      entityType: "job",
      entityId: jobId,
      createdAt: nowIso(),
    };
    await db.collection("jobs").doc(jobId).collection("auditEvents").doc(record.id).set(record, { merge: false });
    return record;
  },

  /**
   * Idempotent append: if doc exists, return existing.
   * Fail-closed: transaction failure throws.
   */
  async appendJobAuditIdempotent(jobId: string, event: Omit<AuditEventRecord, "entityType" | "entityId" | "createdAt">) {
    const ref = db.collection("jobs").doc(jobId).collection("auditEvents").doc(event.id);
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (doc.exists) return doc.data() as AuditEventRecord;
      const record: AuditEventRecord = {
        ...event,
        entityType: "job",
        entityId: jobId,
        createdAt: nowIso(),
      };
      tx.set(ref, record);
      return record;
    });
  },
};




