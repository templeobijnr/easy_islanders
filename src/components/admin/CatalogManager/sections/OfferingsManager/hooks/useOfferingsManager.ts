/**
 * useOfferingsManager - ViewModel Hook
 *
 * Manages all state and handlers for OfferingsManager.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, Timestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../../../../services/firebaseConfig";
import { DEFAULT_FORM_DATA } from "../../ItemForm";
import type { ItemFormData } from "../../ItemForm";
import type { ListingDataItem } from "../ItemsList";
import type { IngestKind, IngestProposal, ExtractionStatus } from "../types";
import { CATEGORY_PRESETS } from "../constants";
import { createIngestJobFromUrl as apiCreateUrl, createIngestJobFromFile as apiCreateFile, applyProposal as apiApply, rejectProposal as apiReject } from "./ingestApi";

interface UseOfferingsManagerOptions {
    listingId: string;
    listingTitle: string;
    marketId: string;
    kinds: IngestKind[];
}

export function useOfferingsManager({ listingId, marketId, kinds }: UseOfferingsManagerOptions) {
    const [selectedKind, setSelectedKind] = useState<IngestKind>(kinds[0] || "offerings");
    const [items, setItems] = useState<ListingDataItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [proposalLoading, setProposalLoading] = useState(false);
    const [proposal, setProposal] = useState<IngestProposal | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>("idle");
    const [extractionMessage, setExtractionMessage] = useState("");

    const categories = useMemo(() => CATEGORY_PRESETS[selectedKind] || ["General"], [selectedKind]);
    const [formData, setFormData] = useState<ItemFormData>(DEFAULT_FORM_DATA);

    useEffect(() => { if (kinds.length && !kinds.includes(selectedKind)) setSelectedKind(kinds[0]); }, [kinds.join("|")]);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const ref = collection(db, `listings/${listingId}/${selectedKind}`);
            const snapshot = await getDocs(ref);
            const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ListingDataItem[];
            loaded.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
            setItems(loaded);
        } catch (error) { console.error("Failed to load listing data:", error); }
        finally { setLoading(false); }
    }, [listingId, selectedKind]);

    const loadLatestProposal = useCallback(async () => {
        setProposalLoading(true);
        try {
            const ref = collection(db, `listings/${listingId}/ingestProposals`);
            const snap = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(20)));
            const proposals = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as IngestProposal[];
            setProposal(proposals.find((p) => p.kind === selectedKind && p.status === "proposed") || null);
        } catch (error) { console.error("Failed to load proposals:", error); setProposal(null); }
        finally { setProposalLoading(false); }
    }, [listingId, selectedKind]);

    const loadProposalById = useCallback(async (proposalId: string) => {
        setProposalLoading(true);
        try {
            const snap = await getDoc(doc(db, `listings/${listingId}/ingestProposals`, proposalId));
            if (!snap.exists()) { setProposal(null); return null; }
            const data = { id: snap.id, ...snap.data() } as IngestProposal;
            setProposal(data);
            return data;
        } catch (error) { console.error("Failed to load proposal:", error); setProposal(null); return null; }
        finally { setProposalLoading(false); }
    }, [listingId]);

    const pollJobUntilDone = useCallback(async (jobId: string) => {
        setExtractionStatus("processing");
        setExtractionMessage("Starting extraction...");
        const jobRef = doc(db, `markets/${marketId}/catalogIngestJobs`, jobId);
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            try {
                const snap = await getDoc(jobRef);
                if (!snap.exists()) return;
                const job = snap.data();
                const status = String(job.status || "");
                if (status === "failed") { clearInterval(interval); setExtractionStatus("error"); setExtractionMessage(job.error || "Failed."); return; }
                if (status === "needs_review" && job.proposalId) { clearInterval(interval); await loadProposalById(job.proposalId); setExtractionStatus("complete"); setExtractionMessage("Ready for review."); setShowImportModal(false); setShowProposalModal(true); return; }
                if (status === "processing") setExtractionMessage("Extracting...");
                if (attempts >= 60) { clearInterval(interval); setExtractionStatus("complete"); setExtractionMessage("Timed out."); }
            } catch (e: any) { clearInterval(interval); setExtractionStatus("error"); setExtractionMessage(e?.message || "Error."); }
        }, 2000);
    }, [marketId, loadProposalById]);

    const resetForm = useCallback(() => { setFormData({ ...DEFAULT_FORM_DATA, category: categories[0] || "" }); setEditingId(null); setShowAddForm(false); }, [categories]);

    const handleSave = useCallback(async () => {
        if (!formData.name.trim()) return;
        setSaving(true);
        try {
            const itemId = editingId || `item_${Date.now()}`;
            const itemRef = doc(db, `listings/${listingId}/${selectedKind}`, itemId);
            const existing = editingId ? items.find((i) => i.id === editingId) : undefined;
            await setDoc(itemRef, { name: formData.name.trim(), description: formData.description.trim() || null, price: Number(formData.price) || 0, currency: formData.currency, category: formData.category || null, available: formData.available, sortOrder: existing?.sortOrder ?? items.length, updatedAt: Timestamp.now(), ...(editingId ? {} : { createdAt: Timestamp.now() }) }, { merge: true });
            await loadItems(); resetForm();
        } catch (error) { console.error("Failed to save:", error); }
        finally { setSaving(false); }
    }, [formData, editingId, items, listingId, selectedKind, loadItems, resetForm]);

    const handleEdit = useCallback((item: ListingDataItem) => { setFormData({ name: item.name, description: item.description || "", price: item.price, currency: item.currency, category: item.category || "", available: item.available }); setEditingId(item.id); setShowAddForm(true); }, []);

    const handleDelete = useCallback(async (itemId: string) => { if (!confirm("Delete?")) return; try { await deleteDoc(doc(db, `listings/${listingId}/${selectedKind}`, itemId)); await loadItems(); } catch (error) { console.error("Delete failed:", error); } }, [listingId, selectedKind, loadItems]);

    const createIngestJobFromUrl = useCallback((url: string) => apiCreateUrl(marketId, listingId, selectedKind, url), [marketId, listingId, selectedKind]);
    const createIngestJobFromFile = useCallback((file: File) => apiCreateFile(marketId, listingId, selectedKind, file), [marketId, listingId, selectedKind]);
    const applyProposal = useCallback((proposalId: string) => apiApply(listingId, proposalId), [listingId]);
    const rejectProposal = useCallback((proposalId: string) => apiReject(listingId, proposalId), [listingId]);

    const grouped = useMemo(() => items.reduce((acc, item) => { const cat = item.category || "Uncategorized"; if (!acc[cat]) acc[cat] = []; acc[cat].push(item); return acc; }, {} as Record<string, ListingDataItem[]>), [items]);

    useEffect(() => { if (!listingId) return; loadItems(); loadLatestProposal(); }, [listingId, selectedKind, loadItems, loadLatestProposal]);

    return { selectedKind, setSelectedKind, categories, items, grouped, loading, formData, setFormData, showAddForm, setShowAddForm, editingId, saving, resetForm, handleSave, handleEdit, handleDelete, proposal, proposalLoading, showProposalModal, setShowProposalModal, applyProposal, rejectProposal, loadItems, showImportModal, setShowImportModal, extractionStatus, setExtractionStatus, extractionMessage, createIngestJobFromUrl, createIngestJobFromFile, pollJobUntilDone };
}
