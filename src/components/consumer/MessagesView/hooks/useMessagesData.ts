/**
 * useMessagesData - Main data hook for MessagesView
 *
 * Handles Firestore subscriptions for bookings and messages.
 */
// Vite build repro (before fix):
// Could not resolve "./utils" from "src/components/consumer/MessagesView/hooks/useMessagesData.ts"
import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

// Alias imports (stable + avoids fragile ../../.. paths)
import { db } from "@/services/firebaseConfig";
import { useAuth } from "@/context/AuthContext";

// Local module imports (MessagesView package)
import type { BookingSummary, BookingMessage } from "../types";
import { parseDate } from "../utils";

export function useMessagesData() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingSummary[]>([]);
    const [messages, setMessages] = useState<BookingMessage[]>([]);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [itemTitles, setItemTitles] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [newMessage, setNewMessage] = useState("");

    // Fetch titles for bookings
    const fetchTitles = useCallback(async (ids: string[], collectionName: string, target: Record<string, string>) => {
        for (const id of ids) {
            if (!id || target[id]) continue;
            try {
                const snap = await getDoc(doc(db, collectionName, id));
                if (snap.exists()) {
                    const data = snap.data();
                    target[id] = data.title || data.name || "Unknown";
                }
            } catch (err) {
                console.error(`Failed to fetch ${collectionName}/${id}:`, err);
            }
        }
        setItemTitles({ ...target });
    }, []);

    // Subscribe to bookings
    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }

        const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
        const unsub = onSnapshot(q, async (snap) => {
            const loaded = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    checkIn: parseDate(data.checkIn),
                    checkOut: parseDate(data.checkOut),
                } as BookingSummary;
            });
            setBookings(loaded.sort((a, b) => (b.checkIn?.getTime() || 0) - (a.checkIn?.getTime() || 0)));

            // Fetch titles for different catalog types
            const titles: Record<string, string> = {};
            const stayIds = loaded.filter((b) => b.stayId).map((b) => b.stayId!);
            const activityIds = loaded.filter((b) => b.activityId).map((b) => b.activityId!);
            const eventIds = loaded.filter((b) => b.eventId).map((b) => b.eventId!);
            const placeIds = loaded.filter((b) => b.placeId).map((b) => b.placeId!);

            await fetchTitles(stayIds, "listings", titles);
            await fetchTitles(activityIds, "listings", titles);
            await fetchTitles(eventIds, "listings", titles);
            await fetchTitles(placeIds, "listings", titles);

            setIsLoading(false);
        }, () => setIsLoading(false));

        return unsub;
    }, [user?.uid, fetchTitles]);

    // Subscribe to messages for selected booking
    useEffect(() => {
        if (!selectedBookingId) {
            setMessages([]);
            return;
        }

        const q = query(collection(db, "booking_messages"), where("bookingId", "==", selectedBookingId));
        const unsub = onSnapshot(q, (snap) => {
            const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: parseDate(d.data().createdAt) } as BookingMessage))
                .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
            setMessages(loaded);
        });

        return unsub;
    }, [selectedBookingId]);

    const sendMessage = useCallback(async () => {
        if (!newMessage.trim() || !selectedBookingId || !user) return;
        setIsSending(true);
        try {
            await addDoc(collection(db, "booking_messages"), {
                bookingId: selectedBookingId,
                userId: user.uid,
                body: newMessage.trim(),
                direction: "outbound",
                senderRole: "guest",
                createdAt: serverTimestamp(),
            });
            setNewMessage("");
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setIsSending(false);
        }
    }, [newMessage, selectedBookingId, user]);

    const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
    const getItemTitle = (booking: BookingSummary) => {
        const itemId = booking.stayId || booking.activityId || booking.eventId || booking.placeId || booking.experienceId;
        return itemId ? (itemTitles[itemId] || booking.itemTitle || "Booking") : "Booking";
    };

    return {
        bookings,
        messages,
        selectedBooking,
        selectedBookingId,
        setSelectedBookingId,
        isLoading,
        isSending,
        newMessage,
        setNewMessage,
        sendMessage,
        getItemTitle,
    };
}
