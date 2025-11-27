/**
 * Custom Hook: useFirestoreQuery
 *
 * A reusable hook for real-time Firestore queries.
 * Follows the best practices from firestore-typescript.md guide.
 *
 * Features:
 * - Real-time updates using onSnapshot
 * - Automatic cleanup on unmount
 * - Loading and error states
 * - TypeScript support
 *
 * @example
 * ```typescript
 * const { documents, loading, error } = useFirestoreQuery<Booking>(
 *   'bookings',
 *   [where('userId', '==', user.uid), orderBy('date', 'desc')]
 * );
 * ```
 */

import { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, onSnapshot, QueryConstraint, FirestoreError } from 'firebase/firestore';

interface UseFirestoreQueryResult<T> {
    documents: T[];
    loading: boolean;
    error: FirestoreError | null;
}

/**
 * Real-time Firestore query hook
 *
 * @param collectionName - The name of the Firestore collection
 * @param constraints - Array of query constraints (where, orderBy, limit, etc.)
 * @returns Object containing documents, loading state, and error
 */
export function useFirestoreQuery<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
): UseFirestoreQueryResult<T> {
    const [documents, setDocuments] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    useEffect(() => {
        // Build the query with constraints
        const q = query(collection(db, collectionName), ...constraints);

        // Set up real-time listener
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as T));

                setDocuments(docs);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(`Firestore query error (${collectionName}):`, err);
                setError(err);
                setLoading(false);
            }
        );

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [collectionName, ...constraints]); // Re-subscribe if collection or constraints change

    return { documents, loading, error };
}

/**
 * Hook for a single document real-time listener
 *
 * @example
 * ```typescript
 * const { document, loading, error } = useFirestoreDoc<Booking>(
 *   'bookings',
 *   bookingId
 * );
 * ```
 */
export function useFirestoreDoc<T>(
    collectionName: string,
    documentId: string | null
): { document: T | null; loading: boolean; error: FirestoreError | null } {
    const [document, setDocument] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    useEffect(() => {
        if (!documentId) {
            setLoading(false);
            return;
        }

        const { doc, onSnapshot } = require('firebase/firestore');
        const docRef = doc(db, collectionName, documentId);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setDocument({
                        id: snapshot.id,
                        ...snapshot.data()
                    } as T);
                } else {
                    setDocument(null);
                }
                setLoading(false);
                setError(null);
            },
            (err: FirestoreError) => {
                console.error(`Firestore doc error (${collectionName}/${documentId}):`, err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, documentId]);

    return { document, loading, error };
}
