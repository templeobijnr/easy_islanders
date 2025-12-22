/**
 * useTaxiStatus - Subscription hook for taxi request status
 *
 * Handles Firestore real-time subscription for taxi request updates.
 */
import { useState, useEffect } from "react";
import { db } from "../../services/firebaseConfig";
import { collection, query, where, onSnapshot, orderBy, limit, doc } from "firebase/firestore";
import type { TaxiRequest, TaxiStatusCardProps } from "./types";

interface UseTaxiStatusResult {
    request: TaxiRequest | null;
    isLoading: boolean;
    error: string | null;
}

export function useTaxiStatus({ userId, requestId }: TaxiStatusCardProps): UseTaxiStatusResult {
    const [request, setRequest] = useState<TaxiRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        let unsubscribe: () => void;

        try {
            if (requestId) {
                // Subscribe to specific request
                const docRef = doc(db, "taxi_requests", requestId);
                unsubscribe = onSnapshot(docRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setRequest({
                            id: snap.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.() || new Date(),
                            assignedAt: data.assignedAt?.toDate?.(),
                        } as TaxiRequest);
                    } else {
                        setRequest(null);
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.error("Taxi status subscription error:", err);
                    setError("Failed to load taxi status");
                    setIsLoading(false);
                });
            } else {
                // Subscribe to latest active request for user
                const q = query(
                    collection(db, "taxi_requests"),
                    where("userId", "==", userId),
                    where("status", "in", ["pending", "assigned", "en_route"]),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );

                unsubscribe = onSnapshot(q, (snap) => {
                    if (!snap.empty) {
                        const doc = snap.docs[0];
                        const data = doc.data();
                        setRequest({
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.() || new Date(),
                            assignedAt: data.assignedAt?.toDate?.(),
                        } as TaxiRequest);
                    } else {
                        setRequest(null);
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.error("Taxi status subscription error:", err);
                    setError("Failed to load taxi status");
                    setIsLoading(false);
                });
            }
        } catch (err) {
            console.error("Failed to setup subscription:", err);
            setError("Failed to connect");
            setIsLoading(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [userId, requestId]);

    return { request, isLoading, error };
}
