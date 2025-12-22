/**
 * Subscription Hook (RUN-01)
 *
 * Standardizes Firestore onSnapshot lifecycle with enforced cleanup.
 *
 * INVARIANTS:
 * - All subscriptions have subscriptionId for tracking.
 * - Cleanup function guaranteed to unsubscribe.
 * - No zombie listeners after unmount.
 * - All subscribe/unsubscribe logged with traceId.
 *
 * @see Living Document Section 18.4 for invariants.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { onSnapshot, Query, DocumentReference } from 'firebase/firestore';

/**
 * Subscription state.
 */
export interface SubscriptionState<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
}

/**
 * Subscription options.
 */
export interface SubscriptionOptions {
    traceId: string;
    subscriptionName: string;
}

/**
 * Active subscription tracker for debugging.
 */
let activeSubscriptionCount = 0;
const activeSubscriptions = new Map<string, { name: string; startedAt: Date }>();

/**
 * Gets current active subscription count (for testing).
 */
export function getActiveSubscriptionCount(): number {
    return activeSubscriptionCount;
}

/**
 * Logs subscription event.
 */
function logSubscription(
    event: 'subscribe' | 'unsubscribe' | 'error',
    subscriptionId: string,
    traceId: string,
    name: string
): void {
    console.log(`[Subscription] ${event}`, {
        subscriptionId,
        traceId,
        name,
        activeCount: activeSubscriptionCount,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Generates unique subscription ID.
 */
function generateSubscriptionId(): string {
    return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Hook for subscribing to Firestore queries with cleanup.
 *
 * @param query - Firestore query to subscribe to.
 * @param options - Subscription options.
 * @returns Subscription state with data, error, loading.
 */
export function useSubscription<T>(
    query: Query | null,
    options: SubscriptionOptions
): SubscriptionState<T[]> {
    const { traceId, subscriptionName } = options;
    const [state, setState] = useState<SubscriptionState<T[]>>({
        data: null,
        error: null,
        loading: true,
    });

    const subscriptionIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!query) {
            setState({ data: null, error: null, loading: false });
            return;
        }

        const subscriptionId = generateSubscriptionId();
        subscriptionIdRef.current = subscriptionId;

        // Track subscription
        activeSubscriptionCount++;
        activeSubscriptions.set(subscriptionId, {
            name: subscriptionName,
            startedAt: new Date(),
        });

        logSubscription('subscribe', subscriptionId, traceId, subscriptionName);

        const unsubscribe = onSnapshot(
            query,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as T[];

                setState({ data, error: null, loading: false });
            },
            (error) => {
                logSubscription('error', subscriptionId, traceId, subscriptionName);
                setState({ data: null, error, loading: false });
            }
        );

        // Cleanup function
        return () => {
            unsubscribe();
            activeSubscriptionCount--;
            activeSubscriptions.delete(subscriptionId);
            logSubscription('unsubscribe', subscriptionId, traceId, subscriptionName);
        };
    }, [query, traceId, subscriptionName]);

    return state;
}

/**
 * Hook for subscribing to a single Firestore document.
 */
export function useDocumentSubscription<T>(
    docRef: DocumentReference | null,
    options: SubscriptionOptions
): SubscriptionState<T> {
    const { traceId, subscriptionName } = options;
    const [state, setState] = useState<SubscriptionState<T>>({
        data: null,
        error: null,
        loading: true,
    });

    const subscriptionIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!docRef) {
            setState({ data: null, error: null, loading: false });
            return;
        }

        const subscriptionId = generateSubscriptionId();
        subscriptionIdRef.current = subscriptionId;

        activeSubscriptionCount++;
        activeSubscriptions.set(subscriptionId, {
            name: subscriptionName,
            startedAt: new Date(),
        });

        logSubscription('subscribe', subscriptionId, traceId, subscriptionName);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setState({
                        data: { id: snapshot.id, ...snapshot.data() } as T,
                        error: null,
                        loading: false,
                    });
                } else {
                    setState({ data: null, error: null, loading: false });
                }
            },
            (error) => {
                logSubscription('error', subscriptionId, traceId, subscriptionName);
                setState({ data: null, error, loading: false });
            }
        );

        return () => {
            unsubscribe();
            activeSubscriptionCount--;
            activeSubscriptions.delete(subscriptionId);
            logSubscription('unsubscribe', subscriptionId, traceId, subscriptionName);
        };
    }, [docRef, traceId, subscriptionName]);

    return state;
}

/**
 * Manual subscription creator (for non-React contexts).
 */
export function createSubscription<T>(
    query: Query,
    onData: (data: T[]) => void,
    onError: (error: Error) => void,
    options: SubscriptionOptions
): () => void {
    const { traceId, subscriptionName } = options;
    const subscriptionId = generateSubscriptionId();

    activeSubscriptionCount++;
    activeSubscriptions.set(subscriptionId, {
        name: subscriptionName,
        startedAt: new Date(),
    });

    logSubscription('subscribe', subscriptionId, traceId, subscriptionName);

    const unsubscribe = onSnapshot(
        query,
        (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as T[];
            onData(data);
        },
        (error) => {
            logSubscription('error', subscriptionId, traceId, subscriptionName);
            onError(error);
        }
    );

    return () => {
        unsubscribe();
        activeSubscriptionCount--;
        activeSubscriptions.delete(subscriptionId);
        logSubscription('unsubscribe', subscriptionId, traceId, subscriptionName);
    };
}
