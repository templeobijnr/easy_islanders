/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business logic + Firestore access.
 * NO HTTP, NO callable context, NO auth logic.
 *
 * OWNS: bookings collection only
 * MAY READ: listings, requests, users (but does not)
 * MUST NOT WRITE: anything except bookings
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
    Booking,
    CreateBookingInput,
    BookingStatus,
    BookingQuery,
} from "./bookings.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

const BOOKINGS_COLLECTION = "bookings";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (boring and explicit)
// ─────────────────────────────────────────────────────────────────────────────

function timestampToDate(ts: Timestamp | undefined): Date | undefined {
    if (!ts) {
        return undefined;
    }
    return ts.toDate();
}

function docToBooking(doc: FirebaseFirestore.DocumentSnapshot): Booking | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    const booking: Booking = {
        id: doc.id,
        userId: data.userId,
        listingId: data.listingId,
        requestId: data.requestId,
        type: data.type,
        status: data.status || "pending",
        itemTitle: data.itemTitle,
        region: data.region,
        scheduledDate: timestampToDate(data.scheduledDate),
        partySize: data.partySize,
        totalAmount: data.totalAmount,
        currency: data.currency || "GBP",
        notes: data.notes,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
        confirmedAt: timestampToDate(data.confirmedAt),
        completedAt: timestampToDate(data.completedAt),
        cancelledAt: timestampToDate(data.cancelledAt),
        cancelledBy: data.cancelledBy,
        cancellationReason: data.cancellationReason,
    };

    return booking;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const BookingsService = {
    /**
     * Get a booking by ID
     */
    async getBooking(bookingId: string): Promise<Booking | null> {
        const doc = await db.collection(BOOKINGS_COLLECTION).doc(bookingId).get();
        return docToBooking(doc);
    },

    /**
     * Create a new booking
     */
    async createBooking(userId: string, input: CreateBookingInput): Promise<string> {
        const now = Timestamp.now();
        const ref = db.collection(BOOKINGS_COLLECTION).doc();

        const bookingData = {
            userId: userId,
            listingId: input.listingId || null,
            requestId: input.requestId || null,
            type: input.type,
            status: "pending",
            itemTitle: input.itemTitle,
            region: input.region || null,
            scheduledDate: input.scheduledDate ? Timestamp.fromDate(input.scheduledDate) : null,
            partySize: input.partySize || null,
            totalAmount: input.totalAmount || null,
            currency: input.currency || "GBP",
            notes: input.notes || null,
            createdAt: now,
            updatedAt: now,
            confirmedAt: null,
            completedAt: null,
            cancelledAt: null,
            cancelledBy: null,
            cancellationReason: null,
        };

        await ref.set(bookingData);

        return ref.id;
    },

    /**
     * Get bookings for a user
     */
    async getBookingsForUser(userId: string, query?: BookingQuery): Promise<Booking[]> {
        let ref: FirebaseFirestore.Query = db
            .collection(BOOKINGS_COLLECTION)
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc");

        // Apply filters (explicit)
        if (query?.status !== undefined) {
            ref = ref.where("status", "==", query.status);
        }
        if (query?.type !== undefined) {
            ref = ref.where("type", "==", query.type);
        }

        // Apply limit
        const limit = query?.limit || 50;
        ref = ref.limit(limit);

        const snapshot = await ref.get();

        const bookings: Booking[] = [];
        for (const doc of snapshot.docs) {
            const booking = docToBooking(doc);
            if (booking !== null) {
                bookings.push(booking);
            }
        }

        return bookings;
    },

    /**
     * Update booking status
     */
    async updateBookingStatus(
        bookingId: string,
        newStatus: BookingStatus,
        additionalData?: {
            confirmedAt?: Date;
            completedAt?: Date;
            cancelledAt?: Date;
            cancelledBy?: string;
            cancellationReason?: string;
        }
    ): Promise<Booking | null> {
        const docRef = db.collection(BOOKINGS_COLLECTION).doc(bookingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const now = Timestamp.now();
        const updateData: Record<string, unknown> = {
            status: newStatus,
            updatedAt: now,
        };

        // Add additional timestamp data if provided
        if (additionalData?.confirmedAt) {
            updateData.confirmedAt = Timestamp.fromDate(additionalData.confirmedAt);
        }
        if (additionalData?.completedAt) {
            updateData.completedAt = Timestamp.fromDate(additionalData.completedAt);
        }
        if (additionalData?.cancelledAt) {
            updateData.cancelledAt = Timestamp.fromDate(additionalData.cancelledAt);
        }
        if (additionalData?.cancelledBy) {
            updateData.cancelledBy = additionalData.cancelledBy;
        }
        if (additionalData?.cancellationReason) {
            updateData.cancellationReason = additionalData.cancellationReason;
        }

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        return docToBooking(updatedDoc);
    },

    /**
     * Get booking user ID
     */
    async getBookingUserId(bookingId: string): Promise<string | null> {
        const doc = await db.collection(BOOKINGS_COLLECTION).doc(bookingId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.userId || null;
    },

    /**
     * Get booking status
     */
    async getBookingStatus(bookingId: string): Promise<BookingStatus | null> {
        const doc = await db.collection(BOOKINGS_COLLECTION).doc(bookingId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.status || null;
    },
};
