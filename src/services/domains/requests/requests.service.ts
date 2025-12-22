/**
 * Domain Service: Requests
 *
 * Responsibility:
 * - Query and filter service requests
 * - Update request status
 * - Assign providers to requests
 *
 * Firestore Collections:
 * - requests
 *
 * Layer: Domain Service
 *
 * Dependencies:
 * - firebaseConfig (infrastructure)
 *
 * Notes:
 * - Does NOT perform cross-domain orchestration
 * - Safe to modify in isolation
 */

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    Timestamp,
    limit
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Request, RequestStatus } from '../../../types/requests';

const COLLECTION = 'requests';

export const requestsService = {
    /**
     * Fetch all requests, optionally filtered
     */
    getRequests: async (filters?: { status?: RequestStatus; type?: string; limit?: number }): Promise<Request[]> => {
        try {
            let q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));

            if (filters?.status) {
                q = query(q, where('status', '==', filters.status));
            }

            if (filters?.type) {
                q = query(q, where('type', '==', filters.type));
            }

            if (filters?.limit) {
                q = query(q, limit(filters.limit));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
        } catch (error) {
            console.error("Error fetching requests:", error);
            throw error;
        }
    },

    /**
     * Update request status
     */
    updateStatus: async (requestId: string, status: RequestStatus): Promise<void> => {
        try {
            const ref = doc(db, COLLECTION, requestId);
            await updateDoc(ref, {
                status,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error(`Error updating request ${requestId} status:`, error);
            throw error;
        }
    },

    /**
     * Assign a provider to a request
     */
    assignProvider: async (requestId: string, providerId: string): Promise<void> => {
        try {
            const ref = doc(db, COLLECTION, requestId);
            await updateDoc(ref, {
                assignedProviderId: providerId,
                status: 'waiting_on_provider', // Auto-update status
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error(`Error assigning provider to request ${requestId}:`, error);
            throw error;
        }
    }
};
