/**
 * connectService Subscriptions
 *
 * Real-time listeners for check-ins and activity updates.
 */
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { CheckIn } from "./types";
import { CHECKINS_COLLECTION } from "./types";

/**
 * Subscribe to all active check-ins (for map overview)
 * Returns unsubscribe function
 */
export function subscribeToAllActiveCheckIns(
    callback: (checkIns: CheckIn[]) => void
): Unsubscribe {
    const now = Timestamp.now();
    const q = query(
        collection(db, CHECKINS_COLLECTION),
        where("expiresAt", ">", now),
        orderBy("expiresAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const checkIns: CheckIn[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<CheckIn, "id">),
        }));
        callback(checkIns);
    });
}
