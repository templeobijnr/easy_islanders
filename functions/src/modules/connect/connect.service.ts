/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Firestore CRUD only. NO auth decisions. NO validation beyond type-safe parsing.
 *
 * OWNS (writes): checkins, joins, userActivities, connectCuration
 * MAY READ: users, listings (for denormalization only)
 * MUST NOT WRITE: users, listings, requests, bookings
 *
 * Idempotency:
 *   - checkins/{userId}_{pinType}_{pinId} (deterministic)
 *   - joins/{userId}_{eventId} (deterministic)
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
    CheckIn,
    Join,
    UserActivity,
    ConnectCurationItem,
    LiveVenue,
    PinType,
    FeedQuery,
    LiveVenuesQuery,
    UpsertCurationInput,
} from "./connect.schema";
import { CHECKIN_EXPIRY_HOURS } from "./connect.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCES (EXACT NAMES)
// ─────────────────────────────────────────────────────────────────────────────

const CHECKINS_COLLECTION = "checkins";
const JOINS_COLLECTION = "joins";
const ACTIVITIES_COLLECTION = "userActivities";
const CURATION_COLLECTION = "connectCuration";
const LISTINGS_COLLECTION = "listings";
const USERS_COLLECTION = "users";

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ID HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildCheckInId(userId: string, pinType: PinType, pinId: string): string {
    return `${userId}_${pinType}_${pinId}`;
}

function buildJoinId(userId: string, eventId: string): string {
    return `${userId}_${eventId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMESTAMP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function timestampToDate(ts: Timestamp | undefined): Date | undefined {
    if (!ts) {
        return undefined;
    }
    return ts.toDate();
}

function timestampToDateRequired(ts: Timestamp | undefined): Date {
    if (!ts) {
        return new Date();
    }
    return ts.toDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOC CONVERTERS
// ─────────────────────────────────────────────────────────────────────────────

function docToCheckIn(doc: FirebaseFirestore.DocumentSnapshot): CheckIn | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        pinId: data.pinId,
        pinType: data.pinType,
        pinTitle: data.pinTitle,
        region: data.region,
        coordinates: data.coordinates,
        expiresAt: timestampToDateRequired(data.expiresAt),
        createdAt: timestampToDateRequired(data.createdAt),
        updatedAt: timestampToDateRequired(data.updatedAt),
    };
}

function docToJoin(doc: FirebaseFirestore.DocumentSnapshot): Join | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        region: data.region,
        status: data.status || "joined",
        createdAt: timestampToDateRequired(data.createdAt),
        updatedAt: timestampToDateRequired(data.updatedAt),
    };
}

function docToActivity(doc: FirebaseFirestore.DocumentSnapshot): UserActivity | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    return {
        id: doc.id,
        type: data.type,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        pinId: data.pinId,
        pinType: data.pinType,
        pinTitle: data.pinTitle,
        region: data.region,
        coordinates: data.coordinates,
        refId: data.refId,
        expiresAt: timestampToDate(data.expiresAt),
        createdAt: timestampToDateRequired(data.createdAt),
    };
}

function docToCurationItem(doc: FirebaseFirestore.DocumentSnapshot): ConnectCurationItem | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    return {
        id: doc.id,
        pinId: data.pinId,
        pinType: data.pinType,
        title: data.title,
        region: data.region,
        coordinates: data.coordinates,
        priority: data.priority ?? 0,
        active: data.active ?? true,
        startsAt: timestampToDate(data.startsAt),
        endsAt: timestampToDate(data.endsAt),
        createdBy: data.createdBy,
        createdAt: timestampToDateRequired(data.createdAt),
        updatedAt: timestampToDateRequired(data.updatedAt),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DENORMALIZATION HELPERS (read-only from other collections)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchListingInfo(pinId: string): Promise<{
    title?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
} | null> {
    const doc = await db.collection(LISTINGS_COLLECTION).doc(pinId).get();
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        title: data.title,
        region: data.region,
        coordinates: data.coordinates,
    };
}

async function fetchUserInfo(userId: string): Promise<{
    displayName?: string;
    photoURL?: string;
} | null> {
    const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        displayName: data.displayName,
        photoURL: data.photoURL,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY WRITER (internal)
// ─────────────────────────────────────────────────────────────────────────────

async function writeActivity(data: {
    type: "checkin" | "join" | "leave";
    userId: string;
    userName?: string;
    userPhotoURL?: string;
    pinId?: string;
    pinType?: PinType;
    pinTitle?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    refId: string;
    expiresAt?: Date;
}): Promise<string> {
    const now = Timestamp.fromDate(new Date());
    const ref = db.collection(ACTIVITIES_COLLECTION).doc();

    const activityData = {
        type: data.type,
        userId: data.userId,
        userName: data.userName || null,
        userPhotoURL: data.userPhotoURL || null,
        pinId: data.pinId || null,
        pinType: data.pinType || null,
        pinTitle: data.pinTitle || null,
        region: data.region || null,
        coordinates: data.coordinates || null,
        refId: data.refId,
        expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
        createdAt: now,
    };

    await ref.set(activityData);
    return ref.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const ConnectService = {
    /**
     * Upsert check-in (idempotent)
     * - Uses deterministic ID: {userId}_{pinType}_{pinId}
     * - On repeat call: refreshes expiresAt and updatedAt
     * - Creates activity item on first create only
     */
    async upsertCheckIn(params: {
        userId: string;
        pinId: string;
        pinType: PinType;
    }): Promise<CheckIn> {
        const { userId, pinId, pinType } = params;
        const docId = buildCheckInId(userId, pinType, pinId);
        const docRef = db.collection(CHECKINS_COLLECTION).doc(docId);

        const now = new Date();
        const nowTimestamp = Timestamp.fromDate(now);
        const expiresAt = new Date(now.getTime() + CHECKIN_EXPIRY_HOURS * 60 * 60 * 1000);
        const expiresAtTimestamp = Timestamp.fromDate(expiresAt);

        // Check if exists
        const existingDoc = await docRef.get();

        // Fetch denormalization data
        const listingInfo = await fetchListingInfo(pinId);
        const userInfo = await fetchUserInfo(userId);

        if (existingDoc.exists) {
            // Update existing: refresh expiry
            await docRef.update({
                expiresAt: expiresAtTimestamp,
                updatedAt: nowTimestamp,
                userName: userInfo?.displayName || null,
                userPhotoURL: userInfo?.photoURL || null,
                pinTitle: listingInfo?.title || null,
                region: listingInfo?.region || null,
                coordinates: listingInfo?.coordinates || null,
            });

            const updatedDoc = await docRef.get();
            const result = docToCheckIn(updatedDoc);
            if (result !== null) {
                return result;
            }
        }

        // Create new
        const checkInData = {
            userId: userId,
            userName: userInfo?.displayName || null,
            userPhotoURL: userInfo?.photoURL || null,
            pinId: pinId,
            pinType: pinType,
            pinTitle: listingInfo?.title || null,
            region: listingInfo?.region || null,
            coordinates: listingInfo?.coordinates || null,
            expiresAt: expiresAtTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
        };

        await docRef.set(checkInData);

        // Write activity item on first create
        await writeActivity({
            type: "checkin",
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            pinId: pinId,
            pinType: pinType,
            pinTitle: listingInfo?.title,
            region: listingInfo?.region,
            coordinates: listingInfo?.coordinates,
            refId: docId,
            expiresAt: expiresAt,
        });

        return {
            id: docId,
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            pinId: pinId,
            pinType: pinType,
            pinTitle: listingInfo?.title,
            region: listingInfo?.region,
            coordinates: listingInfo?.coordinates,
            expiresAt: expiresAt,
            createdAt: now,
            updatedAt: now,
        };
    },

    /**
     * Get active (non-expired) check-ins
     */
    async getActiveCheckIns(query: {
        region?: string;
        limit?: number;
    }): Promise<CheckIn[]> {
        const now = Timestamp.fromDate(new Date());

        let ref: FirebaseFirestore.Query = db
            .collection(CHECKINS_COLLECTION)
            .where("expiresAt", ">", now);

        if (query.region !== undefined) {
            ref = ref.where("region", "==", query.region);
        }

        const limit = query.limit || 500;
        ref = ref.limit(limit);

        const snapshot = await ref.get();

        const checkIns: CheckIn[] = [];
        for (const doc of snapshot.docs) {
            const checkIn = docToCheckIn(doc);
            if (checkIn !== null) {
                checkIns.push(checkIn);
            }
        }

        return checkIns;
    },

    /**
     * Upsert join with status "joined" (idempotent)
     * - Uses deterministic ID: {userId}_{eventId}
     * - If already joined, no-op
     * - If was "left", changes to "joined"
     */
    async upsertJoinJoined(params: {
        userId: string;
        eventId: string;
    }): Promise<Join> {
        const { userId, eventId } = params;
        const docId = buildJoinId(userId, eventId);
        const docRef = db.collection(JOINS_COLLECTION).doc(docId);

        const now = new Date();
        const nowTimestamp = Timestamp.fromDate(now);

        const existingDoc = await docRef.get();

        // Fetch denormalization data
        const listingInfo = await fetchListingInfo(eventId);
        const userInfo = await fetchUserInfo(userId);

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;

            if (existingData.status === "joined") {
                // Already joined, return as-is
                const result = docToJoin(existingDoc);
                if (result !== null) {
                    return result;
                }
            }

            // Was "left", update to "joined"
            await docRef.update({
                status: "joined",
                updatedAt: nowTimestamp,
                userName: userInfo?.displayName || null,
                userPhotoURL: userInfo?.photoURL || null,
                eventTitle: listingInfo?.title || null,
                region: listingInfo?.region || null,
            });

            // Write activity
            await writeActivity({
                type: "join",
                userId: userId,
                userName: userInfo?.displayName,
                userPhotoURL: userInfo?.photoURL,
                pinId: eventId,
                pinType: "event",
                pinTitle: listingInfo?.title,
                region: listingInfo?.region,
                coordinates: listingInfo?.coordinates,
                refId: docId,
            });

            const updatedDoc = await docRef.get();
            const result = docToJoin(updatedDoc);
            if (result !== null) {
                return result;
            }
        }

        // Create new join
        const joinData = {
            userId: userId,
            userName: userInfo?.displayName || null,
            userPhotoURL: userInfo?.photoURL || null,
            eventId: eventId,
            eventTitle: listingInfo?.title || null,
            region: listingInfo?.region || null,
            status: "joined",
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
        };

        await docRef.set(joinData);

        // Write activity
        await writeActivity({
            type: "join",
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            pinId: eventId,
            pinType: "event",
            pinTitle: listingInfo?.title,
            region: listingInfo?.region,
            coordinates: listingInfo?.coordinates,
            refId: docId,
        });

        return {
            id: docId,
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            eventId: eventId,
            eventTitle: listingInfo?.title,
            region: listingInfo?.region,
            status: "joined",
            createdAt: now,
            updatedAt: now,
        };
    },

    /**
     * Upsert join with status "left" (idempotent)
     * - Uses deterministic ID: {userId}_{eventId}
     * - If no prior join exists, creates with status "left" (fail-closed)
     * - If already "left", no-op
     */
    async upsertJoinLeft(params: {
        userId: string;
        eventId: string;
    }): Promise<Join> {
        const { userId, eventId } = params;
        const docId = buildJoinId(userId, eventId);
        const docRef = db.collection(JOINS_COLLECTION).doc(docId);

        const now = new Date();
        const nowTimestamp = Timestamp.fromDate(now);

        const existingDoc = await docRef.get();

        // Fetch denormalization data
        const listingInfo = await fetchListingInfo(eventId);
        const userInfo = await fetchUserInfo(userId);

        if (existingDoc.exists) {
            const existingData = existingDoc.data()!;

            if (existingData.status === "left") {
                // Already left, return as-is
                const result = docToJoin(existingDoc);
                if (result !== null) {
                    return result;
                }
            }

            // Was "joined", update to "left"
            await docRef.update({
                status: "left",
                updatedAt: nowTimestamp,
            });

            // Write activity
            await writeActivity({
                type: "leave",
                userId: userId,
                userName: userInfo?.displayName,
                userPhotoURL: userInfo?.photoURL,
                pinId: eventId,
                pinType: "event",
                pinTitle: listingInfo?.title,
                region: listingInfo?.region,
                coordinates: listingInfo?.coordinates,
                refId: docId,
            });

            const updatedDoc = await docRef.get();
            const result = docToJoin(updatedDoc);
            if (result !== null) {
                return result;
            }
        }

        // No prior join: create with status "left" (fail-closed behavior)
        const joinData = {
            userId: userId,
            userName: userInfo?.displayName || null,
            userPhotoURL: userInfo?.photoURL || null,
            eventId: eventId,
            eventTitle: listingInfo?.title || null,
            region: listingInfo?.region || null,
            status: "left",
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
        };

        await docRef.set(joinData);

        // Write activity
        await writeActivity({
            type: "leave",
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            pinId: eventId,
            pinType: "event",
            pinTitle: listingInfo?.title,
            region: listingInfo?.region,
            coordinates: listingInfo?.coordinates,
            refId: docId,
        });

        return {
            id: docId,
            userId: userId,
            userName: userInfo?.displayName,
            userPhotoURL: userInfo?.photoURL,
            eventId: eventId,
            eventTitle: listingInfo?.title,
            region: listingInfo?.region,
            status: "left",
            createdAt: now,
            updatedAt: now,
        };
    },

    /**
     * Get active feed
     * - Excludes expired checkin activities (expiresAt <= now)
     * - Ordered by createdAt desc
     */
    async getActiveFeed(query: FeedQuery): Promise<UserActivity[]> {
        const now = new Date();

        let ref: FirebaseFirestore.Query = db
            .collection(ACTIVITIES_COLLECTION)
            .orderBy("createdAt", "desc");

        if (query.region !== undefined) {
            ref = ref.where("region", "==", query.region);
        }

        const limit = query.limit || 50;
        ref = ref.limit(limit * 2); // Fetch extra to account for filtering

        const snapshot = await ref.get();

        const activities: UserActivity[] = [];
        for (const doc of snapshot.docs) {
            const activity = docToActivity(doc);
            if (activity === null) {
                continue;
            }

            // Exclude expired checkin activities
            if (activity.type === "checkin" && activity.expiresAt) {
                if (activity.expiresAt <= now) {
                    continue;
                }
            }

            activities.push(activity);

            if (activities.length >= limit) {
                break;
            }
        }

        return activities;
    },

    /**
     * Get live venues (aggregated active check-ins)
     * - Only counts non-expired checkins
     * - Sorted by activeCount descending
     */
    async getLiveVenues(query: LiveVenuesQuery): Promise<LiveVenue[]> {
        const now = Timestamp.fromDate(new Date());

        let ref: FirebaseFirestore.Query = db
            .collection(CHECKINS_COLLECTION)
            .where("expiresAt", ">", now);

        if (query.region !== undefined) {
            ref = ref.where("region", "==", query.region);
        }

        // Hard cap to prevent memory issues
        ref = ref.limit(500);

        const snapshot = await ref.get();

        // Aggregate by pinId
        const venueMap = new Map<
            string,
            {
                pinId: string;
                pinType: PinType;
                pinTitle?: string;
                region?: string;
                coordinates?: { lat: number; lng: number };
                count: number;
            }
        >();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const pinId = data.pinId as string;

            const existing = venueMap.get(pinId);
            if (existing) {
                existing.count += 1;
            } else {
                venueMap.set(pinId, {
                    pinId: pinId,
                    pinType: data.pinType as PinType,
                    pinTitle: data.pinTitle,
                    region: data.region,
                    coordinates: data.coordinates,
                    count: 1,
                });
            }
        }

        // Convert to array, sort by count descending, limit
        const limit = query.limit || 50;
        const venues: LiveVenue[] = Array.from(venueMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map((v) => ({
                pinId: v.pinId,
                pinType: v.pinType,
                pinTitle: v.pinTitle,
                region: v.region,
                coordinates: v.coordinates,
                activeCount: v.count,
            }));

        return venues;
    },

    /**
     * Get curation items
     * - Only active items
     * - Respects time window (startsAt/endsAt)
     */
    async getCurationItems(): Promise<ConnectCurationItem[]> {
        const now = new Date();

        const snapshot = await db
            .collection(CURATION_COLLECTION)
            .where("active", "==", true)
            .orderBy("priority", "desc")
            .limit(100)
            .get();

        const items: ConnectCurationItem[] = [];
        for (const doc of snapshot.docs) {
            const item = docToCurationItem(doc);
            if (item === null) {
                continue;
            }

            // Filter by time window
            if (item.startsAt && item.startsAt > now) {
                continue;
            }
            if (item.endsAt && item.endsAt < now) {
                continue;
            }

            items.push(item);
        }

        return items;
    },

    /**
     * Upsert curation item
     * - Upserts by pinId
     */
    async upsertCurationItem(
        input: UpsertCurationInput,
        audit: { adminId: string }
    ): Promise<ConnectCurationItem> {
        const now = Timestamp.fromDate(new Date());

        // Check for existing by pinId
        const existingQuery = await db
            .collection(CURATION_COLLECTION)
            .where("pinId", "==", input.pinId)
            .limit(1)
            .get();

        // Fetch listing info
        const listingInfo = await fetchListingInfo(input.pinId);

        if (!existingQuery.empty) {
            // Update existing
            const existingDoc = existingQuery.docs[0];

            const updateData: Record<string, unknown> = {
                updatedAt: now,
            };

            if (input.priority !== undefined) {
                updateData.priority = input.priority;
            }
            if (input.active !== undefined) {
                updateData.active = input.active;
            }
            if (input.startsAt !== undefined) {
                updateData.startsAt = Timestamp.fromDate(input.startsAt);
            }
            if (input.endsAt !== undefined) {
                updateData.endsAt = Timestamp.fromDate(input.endsAt);
            }
            if (listingInfo) {
                updateData.title = listingInfo.title;
                updateData.region = listingInfo.region;
                updateData.coordinates = listingInfo.coordinates;
            }

            await existingDoc.ref.update(updateData);

            const updatedDoc = await existingDoc.ref.get();
            const result = docToCurationItem(updatedDoc);
            if (result !== null) {
                return result;
            }
        }

        // Create new
        const ref = db.collection(CURATION_COLLECTION).doc();

        const itemData = {
            pinId: input.pinId,
            pinType: input.pinType,
            title: listingInfo?.title || null,
            region: listingInfo?.region || null,
            coordinates: listingInfo?.coordinates || null,
            priority: input.priority ?? 0,
            active: input.active ?? true,
            startsAt: input.startsAt ? Timestamp.fromDate(input.startsAt) : null,
            endsAt: input.endsAt ? Timestamp.fromDate(input.endsAt) : null,
            createdBy: audit.adminId,
            createdAt: now,
            updatedAt: now,
        };

        await ref.set(itemData);

        return {
            id: ref.id,
            pinId: input.pinId,
            pinType: input.pinType,
            title: listingInfo?.title,
            region: listingInfo?.region,
            coordinates: listingInfo?.coordinates,
            priority: input.priority ?? 0,
            active: input.active ?? true,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            createdBy: audit.adminId,
            createdAt: now.toDate(),
            updatedAt: now.toDate(),
        };
    },
};
