
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { Booking } from '../../types';
import { sanitizeData } from './utils';

const COLLECTION = 'bookings';

export const BookingStorage = {
  getUserBookings: async (): Promise<Booking[]> => {
    try {
      const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Booking);
    } catch (error) {
      const err = error as any;
      if (err?.name === 'AbortError') return [];
      console.error("Error getting bookings:", error);
      return [];
    }
  },

  getBusinessBookings: async (businessId?: string): Promise<Booking[]> => {
    // Reuse logic for now, or filter if we had indexed fields
    return BookingStorage.getUserBookings();
  },

  saveBooking: async (booking: Booking): Promise<void> => {
    try {
      await setDoc(doc(db, COLLECTION, booking.id), sanitizeData(booking));
    } catch (error) {
      console.error("Error saving booking:", error);
    }
  }
};
