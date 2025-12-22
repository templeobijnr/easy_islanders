/**
 * Domain Service: Bookings
 *
 * Responsibility:
 * - Create booking requests
 * - Query booked dates for stays
 *
 * Firestore Collections:
 * - bookings
 *
 * Layer: Domain Service
 *
 * Dependencies:
 * - firebaseConfig (infrastructure)
 *
 * Notes:
 * - Does NOT perform cross-domain orchestration
 * - Safe to modify in isolation
 * - Minimal service (35 lines)
 */

import { collection, addDoc, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Booking } from '../../../types/connect';

const COLLECTION = 'bookings';

export const BookingsService = {
    createBooking: async (
        bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>
    ): Promise<string> => {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...bookingData,
            status: 'requested',
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    },

    getBookedDates: async (stayId: string): Promise<{ from: Date; to: Date }[]> => {
        const q = query(
            collection(db, COLLECTION),
            where('stayId', '==', stayId),
            where('status', '==', 'confirmed')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                from: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
                to: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate)
            };
        });
    }
};
