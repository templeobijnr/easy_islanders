/**
 * useBookingsDeck - Subscription and handlers for bookings management
 */
import { useState, useEffect, useCallback } from "react";
import { db } from "@/services/firebaseConfig";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import type { BookingWithStay, Booking } from "../types";

export function useBookingsDeck() {
    const [bookings, setBookings] = useState<BookingWithStay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

    useEffect(() => {
        const q = query(collection(db, "bookings"));
        const unsub = onSnapshot(q, (snap) => {
            const loaded = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    checkIn: data.checkIn?.toDate?.() || null,
                    checkOut: data.checkOut?.toDate?.() || null,
                    createdAt: data.createdAt?.toDate?.() || null,
                } as BookingWithStay;
            });
            setBookings(loaded.sort((a, b) => ((b.createdAt as Date)?.getTime() || 0) - ((a.createdAt as Date)?.getTime() || 0)));
            setIsLoading(false);
        }, () => setIsLoading(false));

        return unsub;
    }, []);

    const updateStatus = useCallback(async (bookingId: string, status: Booking["status"]) => {
        try {
            await updateDoc(doc(db, "bookings", bookingId), { status });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    }, []);

    const handleNotesBlur = useCallback(async (bookingId: string) => {
        if (editingNotes[bookingId] === undefined) return;
        try {
            await updateDoc(doc(db, "bookings", bookingId), { adminNotes: editingNotes[bookingId] });
        } catch (err) {
            console.error("Failed to update notes:", err);
        }
    }, [editingNotes]);

    const openMessages = useCallback((bookingId: string) => {
        setSelectedBookingId(bookingId);
        setShowMessagesModal(true);
    }, []);

    const closeMessages = useCallback(() => {
        setShowMessagesModal(false);
        setSelectedBookingId(null);
    }, []);

    return {
        bookings,
        isLoading,
        selectedBookingId,
        showMessagesModal,
        editingNotes,
        setEditingNotes,
        updateStatus,
        handleNotesBlur,
        openMessages,
        closeMessages,
    };
}
