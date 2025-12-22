/**
 * connectService Actions
 *
 * Check-ins, joins, waves, and user event creation.
 */
import {
    collection,
    doc,
    getDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { PinType, Event, Region } from "../../types";
import type { ActivityCategory } from "../../types/connect";
import {
    CHECKINS_COLLECTION,
    JOINS_COLLECTION,
    USER_ACTIVITIES_COLLECTION,
    EVENTS_COLLECTION,
} from "./types";

/**
 * Check in at a venue/place/activity
 */
export async function checkIn(
    userId: string,
    pinId: string,
    pinType: PinType,
    userDisplayName?: string,
    userAvatarUrl?: string
): Promise<void> {
    await addDoc(collection(db, CHECKINS_COLLECTION), {
        pinId,
        pinType,
        userId,
        userDisplayName: userDisplayName || null,
        userAvatarUrl: userAvatarUrl || null,
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 4 * 60 * 60 * 1000)),
    });
}

/**
 * Join an event (RSVP)
 */
export async function joinEvent(
    userId: string,
    pinId: string,
    pinType: PinType
): Promise<void> {
    await addDoc(collection(db, JOINS_COLLECTION), {
        pinId,
        pinType,
        userId,
        timestamp: serverTimestamp(),
    });

    // Increment join count on event
    if (pinType === "event") {
        const eventRef = doc(db, EVENTS_COLLECTION, pinId);
        await updateDoc(eventRef, { goingCount: increment(1) });
    }
}

/**
 * Wave at someone (placeholder)
 */
export async function wave(
    userId: string,
    pinId: string,
    userDisplayName: string
): Promise<void> {
    console.log("Wave not implemented", { userId, pinId, userDisplayName });
}

/**
 * Create a user event
 */
export async function createUserEvent(
    eventData: Partial<Event>,
    userId: string
): Promise<string> {
    const ref = await addDoc(collection(db, EVENTS_COLLECTION), {
        ...eventData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        goingCount: 0,
        interestedCount: 0,
    });
    return ref.id;
}

/**
 * Create a user activity (enhanced version)
 */
export async function createUserActivity(
    userId: string,
    userDisplayName: string,
    userAvatarUrl: string,
    activity: {
        title: string;
        description?: string;
        category?: ActivityCategory;
        location?: { lat: number; lng: number; address?: string };
        pinId?: string;
        pinType?: PinType;
        region: Region;
        startDate: Date;
        endDate?: Date;
        isAllDay?: boolean;
        images?: string[];
        coverImage?: string;
        visibility?: "public" | "friends" | "private";
    }
): Promise<string> {
    const { startDate, endDate, isAllDay, ...rest } = activity;

    let startTime: Date;
    let endTime: Date;

    if (isAllDay) {
        const todayStart = new Date(startDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(startDate);
        todayEnd.setHours(23, 59, 59, 999);
        startTime = todayStart;
        endTime = todayEnd;
    } else {
        startTime = startDate;
        endTime = endDate || new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    }

    const ref = await addDoc(collection(db, USER_ACTIVITIES_COLLECTION), {
        ...rest,
        userId,
        userDisplayName,
        userAvatarUrl,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        isAllDay: isAllDay || false,
        coverImage: rest.coverImage || rest.images?.[0] || null,
        visibility: rest.visibility || "public",
        going: [userId],
        goingCount: 1,
        interested: [],
        interestedCount: 0,
        createdAt: serverTimestamp(),
        status: "active",
    });

    return ref.id;
}

// Alias for backward compatibility
export const createQuickActivity = createUserActivity;

/**
 * Join a quick activity
 */
export async function joinQuickActivity(
    userId: string,
    activityId: string,
    userDisplayName?: string,
    userAvatarUrl?: string
): Promise<void> {
    const activityRef = doc(db, USER_ACTIVITIES_COLLECTION, activityId);
    const snap = await getDoc(activityRef);

    if (!snap.exists()) throw new Error("Activity not found");

    const data = snap.data();
    const going = Array.isArray(data.going) ? data.going : [];

    if (!going.includes(userId)) {
        await updateDoc(activityRef, {
            going: arrayUnion(userId),
            goingCount: increment(1),
        });
    }
}

/**
 * Toggle "Going" status for an activity
 */
export async function toggleGoing(
    activityId: string,
    userId: string,
    isCurrentlyGoing: boolean
): Promise<void> {
    const activityRef = doc(db, USER_ACTIVITIES_COLLECTION, activityId);
    if (isCurrentlyGoing) {
        await updateDoc(activityRef, {
            going: arrayRemove(userId),
            goingCount: increment(-1),
        });
    } else {
        await updateDoc(activityRef, {
            going: arrayUnion(userId),
            goingCount: increment(1),
            interested: arrayRemove(userId),
        });
    }
}

/**
 * Toggle "Interested" status for an activity
 */
export async function toggleInterested(
    activityId: string,
    userId: string,
    isCurrentlyInterested: boolean
): Promise<void> {
    const activityRef = doc(db, USER_ACTIVITIES_COLLECTION, activityId);
    if (isCurrentlyInterested) {
        await updateDoc(activityRef, {
            interested: arrayRemove(userId),
            interestedCount: increment(-1),
        });
    } else {
        await updateDoc(activityRef, {
            interested: arrayUnion(userId),
            interestedCount: increment(1),
        });
    }
}
