/**
 * Custom Hook: useTaxiRequest
 *
 * Real-time listener for taxi request status updates.
 * Demonstrates best practices for Firestore real-time updates.
 *
 * @example
 * ```tsx
 * function TaxiTracker({ requestId }: { requestId: string }) {
 *   const { request, loading, error } = useTaxiRequest(requestId);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!request) return <div>Request not found</div>;
 *
 *   return (
 *     <div>
 *       <h2>Status: {request.status}</h2>
 *       {request.assignedDriverId && (
 *         <p>Driver assigned: {request.driverName}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { doc, onSnapshot, FirestoreError } from 'firebase/firestore';

interface TaxiRequest {
    id: string;
    userId: string;
    customerName: string;
    customerPhone: string;
    pickup: {
        address: string;
        location: {
            lat: number;
            lng: number;
            district: string;
        };
    };
    dropoff: {
        address: string;
    };
    status: 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';
    assignedDriverId?: string;
    driverName?: string;
    driverPhone?: string;
    priceEstimate?: number;
    createdAt: any;
    acceptedAt?: any;
    completedAt?: any;
}

interface UseTaxiRequestResult {
    request: TaxiRequest | null;
    loading: boolean;
    error: FirestoreError | null;
}

/**
 * Real-time listener for a specific taxi request
 *
 * @param requestId - The taxi request ID to monitor
 * @returns Object containing request data, loading state, and error
 */
export function useTaxiRequest(requestId: string | null): UseTaxiRequestResult {
    const [request, setRequest] = useState<TaxiRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    useEffect(() => {
        if (!requestId) {
            setLoading(false);
            return;
        }

        console.log(`🚕 [useTaxiRequest] Setting up listener for: ${requestId}`);

        const docRef = doc(db, 'taxi_requests', requestId);

        // Real-time listener using onSnapshot
        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = {
                        id: snapshot.id,
                        ...snapshot.data()
                    } as TaxiRequest;

                    setRequest(data);

                    // Log status changes
                    console.log(`🚕 [useTaxiRequest] Status update: ${data.status}`);

                    // Optional: Show notifications on status change
                    if (data.status === 'accepted') {
                        console.log(`✅ Driver ${data.driverName} accepted your request!`);
                    } else if (data.status === 'en_route') {
                        console.log(`🚗 Driver is on the way!`);
                    }
                } else {
                    setRequest(null);
                    console.warn(`⚠️ [useTaxiRequest] Request not found: ${requestId}`);
                }

                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(`🔴 [useTaxiRequest] Error:`, err);
                setError(err);
                setLoading(false);
            }
        );

        // Cleanup: Unsubscribe when component unmounts or requestId changes
        return () => {
            console.log(`🚕 [useTaxiRequest] Cleaning up listener for: ${requestId}`);
            unsubscribe();
        };
    }, [requestId]);

    return { request, loading, error };
}

/**
 * Real-time listener for all user taxi requests
 *
 * @example
 * ```tsx
 * function MyRides() {
 *   const { user } = useAuth();
 *   const { requests, loading } = useUserTaxiRequests(user?.id);
 *
 *   return (
 *     <div>
 *       {requests.map(req => (
 *         <RideCard key={req.id} request={req} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserTaxiRequests(userId: string | null) {
    const [requests, setRequests] = useState<TaxiRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const { collection, query, where, orderBy } = require('firebase/firestore');

        const q = query(
            collection(db, 'taxi_requests'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as TaxiRequest));

                setRequests(docs);
                setLoading(false);
                setError(null);
            },
            (err: FirestoreError) => {
                console.error('🔴 [useUserTaxiRequests] Error:', err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { requests, loading, error };
}
