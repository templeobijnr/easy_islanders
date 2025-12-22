/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business logic + Firestore access.
 * NO HTTP, NO callable context, NO auth logic.
 *
 * BORING CODE ONLY:
 * - Explicit > clever
 * - Repetition > abstraction
 * - Readable in one pass
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
    Request,
    CreateRequestInput,
    RequestStatus,
    RequestQuery,
} from "./requests.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

const REQUESTS_COLLECTION = "requests";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (boring and explicit)
// ─────────────────────────────────────────────────────────────────────────────

function timestampToDate(ts: Timestamp | undefined): Date | undefined {
    if (!ts) {
        return undefined;
    }
    return ts.toDate();
}

function docToRequest(doc: FirebaseFirestore.DocumentSnapshot): Request | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    const request: Request = {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userPhone: data.userPhone,
        userEmail: data.userEmail,
        listingId: data.listingId,
        listingTitle: data.listingTitle,
        proposalId: data.proposalId,
        type: data.type,
        title: data.title,
        description: data.description,
        scheduledDate: timestampToDate(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        assignedAt: timestampToDate(data.assignedAt),
        status: data.status || "pending",
        metadata: data.metadata,
        notes: data.notes,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
        completedAt: timestampToDate(data.completedAt),
        cancelledAt: timestampToDate(data.cancelledAt),
        cancelledBy: data.cancelledBy,
        cancellationReason: data.cancellationReason,
    };

    return request;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const RequestsService = {
    /**
     * Get a request by ID
     */
    async getRequest(requestId: string): Promise<Request | null> {
        const doc = await db.collection(REQUESTS_COLLECTION).doc(requestId).get();
        return docToRequest(doc);
    },

    /**
     * Create a new request
     */
    async createRequest(
        userId: string,
        userName: string | undefined,
        userPhone: string | undefined,
        userEmail: string | undefined,
        input: CreateRequestInput
    ): Promise<string> {
        const now = Timestamp.now();
        const ref = db.collection(REQUESTS_COLLECTION).doc();

        const requestData = {
            userId: userId,
            userName: userName || null,
            userPhone: userPhone || null,
            userEmail: userEmail || null,
            listingId: input.listingId || null,
            listingTitle: input.listingTitle || null,
            proposalId: input.proposalId || null,
            type: input.type,
            title: input.title,
            description: input.description || null,
            scheduledDate: input.scheduledDate ? Timestamp.fromDate(input.scheduledDate) : null,
            scheduledTime: input.scheduledTime || null,
            assignedTo: null,
            assignedToName: null,
            assignedAt: null,
            status: "pending",
            metadata: input.metadata || null,
            notes: input.notes || null,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            cancelledAt: null,
            cancelledBy: null,
            cancellationReason: null,
        };

        await ref.set(requestData);

        return ref.id;
    },

    /**
     * Get requests by user ID
     */
    async getRequestsByUser(userId: string, limit?: number): Promise<Request[]> {
        let ref: FirebaseFirestore.Query = db
            .collection(REQUESTS_COLLECTION)
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc");

        if (limit !== undefined) {
            ref = ref.limit(limit);
        } else {
            ref = ref.limit(50);
        }

        const snapshot = await ref.get();

        const requests: Request[] = [];
        for (const doc of snapshot.docs) {
            const request = docToRequest(doc);
            if (request !== null) {
                requests.push(request);
            }
        }

        return requests;
    },

    /**
     * Get requests by query
     */
    async getRequests(query: RequestQuery): Promise<Request[]> {
        let ref: FirebaseFirestore.Query = db.collection(REQUESTS_COLLECTION);

        // Apply filters (explicit, no magic)
        if (query.userId !== undefined) {
            ref = ref.where("userId", "==", query.userId);
        }
        if (query.assignedTo !== undefined) {
            ref = ref.where("assignedTo", "==", query.assignedTo);
        }
        if (query.status !== undefined) {
            ref = ref.where("status", "==", query.status);
        }
        if (query.type !== undefined) {
            ref = ref.where("type", "==", query.type);
        }
        if (query.listingId !== undefined) {
            ref = ref.where("listingId", "==", query.listingId);
        }

        // Apply limit
        const limit = query.limit || 50;
        ref = ref.limit(limit);

        const snapshot = await ref.get();

        const requests: Request[] = [];
        for (const doc of snapshot.docs) {
            const request = docToRequest(doc);
            if (request !== null) {
                requests.push(request);
            }
        }

        return requests;
    },

    /**
     * Update request status
     */
    async updateRequestStatus(
        requestId: string,
        newStatus: RequestStatus,
        notes?: string
    ): Promise<Request | null> {
        const docRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const now = Timestamp.now();
        const updateData: Record<string, unknown> = {
            status: newStatus,
            updatedAt: now,
        };

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Set completedAt if transitioning to completed
        if (newStatus === "completed") {
            updateData.completedAt = now;
        }

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        return docToRequest(updatedDoc);
    },

    /**
     * Assign a request to a provider
     */
    async assignRequest(
        requestId: string,
        assignedTo: string,
        assignedToName?: string
    ): Promise<Request | null> {
        const docRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const now = Timestamp.now();

        await docRef.update({
            assignedTo: assignedTo,
            assignedToName: assignedToName || null,
            assignedAt: now,
            status: "assigned",
            updatedAt: now,
        });

        const updatedDoc = await docRef.get();
        return docToRequest(updatedDoc);
    },

    /**
     * Cancel a request
     */
    async cancelRequest(
        requestId: string,
        cancelledBy: string,
        reason?: string
    ): Promise<Request | null> {
        const docRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const now = Timestamp.now();

        await docRef.update({
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: cancelledBy,
            cancellationReason: reason || null,
            updatedAt: now,
        });

        const updatedDoc = await docRef.get();
        return docToRequest(updatedDoc);
    },

    /**
     * Get request user ID
     */
    async getRequestUserId(requestId: string): Promise<string | null> {
        const doc = await db.collection(REQUESTS_COLLECTION).doc(requestId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.userId || null;
    },

    /**
     * Get request status
     */
    async getRequestStatus(requestId: string): Promise<RequestStatus | null> {
        const doc = await db.collection(REQUESTS_COLLECTION).doc(requestId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.status || null;
    },

    /**
     * Get request assigned provider
     */
    async getRequestAssignedTo(requestId: string): Promise<string | null> {
        const doc = await db.collection(REQUESTS_COLLECTION).doc(requestId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.assignedTo || null;
    },
};
