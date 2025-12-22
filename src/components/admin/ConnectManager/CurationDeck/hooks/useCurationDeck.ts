/**
 * useCurationDeck - State and handlers for curation management
 */
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { UnifiedListingsService } from "@/services/unifiedListingsService";
import type { CuratedItem, Venue, SectionId } from "../types";
import { RANDOM_NAMES } from "../constants";

export function useCurationDeck() {
    const [items, setItems] = useState<CuratedItem[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionId>("live");

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Load curated items
            const curationRef = collection(db, "connect_curation");
            const snapshot = await getDocs(curationRef);
            const loaded = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
                expiresAt: doc.data().expiresAt?.toDate?.(),
            })) as CuratedItem[];
            setItems(loaded);

            // Load venues for live pulse - use getAll() which exists in the service
            const listings = await UnifiedListingsService.getAll();
            setVenues(listings.map((l: any) => ({ id: l.id, title: l.title || l.name || "", category: l.category || "", region: l.region || "", images: l.images || [], type: l.type || "" })));
        } catch (err) {
            console.error("Failed to load curation data:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRemoveItem = useCallback(async (itemId: string) => {
        try {
            await deleteDoc(doc(db, "connect_curation", itemId));
            setItems((prev) => prev.filter((i) => i.id !== itemId));
        } catch (err) {
            console.error("Failed to remove item:", err);
        }
    }, []);

    const handleToggleActive = useCallback(async (itemId: string, currentState: boolean) => {
        try {
            await updateDoc(doc(db, "connect_curation", itemId), { isActive: !currentState });
            setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: !currentState } : i)));
        } catch (err) {
            console.error("Failed to toggle active:", err);
        }
    }, []);

    const handleSeedCheckIns = useCallback(async () => {
        const liveVenues = venues.filter((v) => ["restaurant", "cafe", "bar", "hotel"].includes(v.type)).slice(0, 8);
        if (liveVenues.length === 0) return;

        const batch = writeBatch(db);
        const checkInsRef = collection(db, "connect_checkins");

        for (const venue of liveVenues) {
            const checkInCount = Math.floor(Math.random() * 8) + 2;
            for (let i = 0; i < checkInCount; i++) {
                const ref = doc(checkInsRef);
                batch.set(ref, {
                    venueId: venue.id,
                    userId: `seed_${Math.random().toString(36).slice(2)}`,
                    userName: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
                    createdAt: new Date(Date.now() - Math.random() * 3600000),
                });
            }
        }

        try {
            await batch.commit();
            alert("Seeded check-ins for live venues!");
            loadData();
        } catch (err) {
            console.error("Failed to seed check-ins:", err);
        }
    }, [venues, loadData]);

    const handleAddComplete = useCallback(() => {
        setShowAddModal(false);
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const itemsBySection = (section: SectionId) => items.filter((i) => i.section === section).sort((a, b) => a.order - b.order);

    return {
        items,
        venues,
        isLoading,
        showAddModal,
        setShowAddModal,
        activeSection,
        setActiveSection,
        handleRemoveItem,
        handleToggleActive,
        handleSeedCheckIns,
        handleAddComplete,
        itemsBySection,
    };
}
