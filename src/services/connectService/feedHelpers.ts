/**
 * Connect Feed Helpers
 *
 * Shared utilities for feed queries.
 */
import { Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { ConnectFeedItem } from "../types";
import type { ActivityStatus } from "../../../types/connect";

/**
 * Safely convert Firestore Timestamp or Date to Date
 */
export function getDate(val: Timestamp | Date | string | number | null | undefined): Date | null {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (val instanceof Date) return val;
    const ts = typeof val === "string" || typeof val === "number" ? Date.parse(val as string) : NaN;
    return isNaN(ts) ? null : new Date(ts);
}

/**
 * Get activity status from times
 */
export function getActivityStatus(startTime: Timestamp | Date, endTime?: Timestamp | Date): ActivityStatus {
    const now = Date.now();
    const start = startTime instanceof Timestamp ? startTime.toDate().getTime() : startTime.getTime();
    const end = endTime
        ? endTime instanceof Timestamp
            ? endTime.toDate().getTime()
            : endTime.getTime()
        : start + 2 * 60 * 60 * 1000;

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
}

/**
 * Process doc helper for feed items
 */
export function processDoc(docSnap: QueryDocumentSnapshot<DocumentData>, type: string): ConnectFeedItem {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        type,
        title: data.title || data.name,
        description: data.description,
        category: data.category,
        region: data.region,
        startTime: data.startTime || data.startDate,
        endTime: data.endTime || data.endDate,
        images: data.images,
        itemImage: data.heroImage || data.images?.[0],
        address: data.address || data.location?.address,
        coordinates: data.coordinates || data.location,
        _status: getActivityStatus(data.startTime || data.startDate, data.endTime || data.endDate),
    };
}
