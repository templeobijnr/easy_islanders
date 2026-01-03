export type AuditEntityType = "job" | "dispatchMessage" | "webhookEvent" | "notification";

export interface EvidenceRef {
  kind: string;
  ref: string;
}

export interface AuditEventRecord {
  /**
   * Deterministic for idempotent transitions, otherwise random.
   */
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorType: "user" | "system" | "provider";
  actorId: string;
  traceId: string;
  idempotencyKey?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  evidenceRefs?: EvidenceRef[];
  createdAt: string; // ISO
}




