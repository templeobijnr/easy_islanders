/**
 * useKnowledgeAssets - Assets loading and management hook
 */
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../services/firebaseConfig";
import { StorageService } from "../../../../services/infrastructure/storage/local-storage.service";
import type { KnowledgeAsset } from "../types";

export function useKnowledgeAssets(businessId: string | null) {
    const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

    const loadAssets = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);

        try {
            const assetsRef = collection(db, `businesses/${businessId}/knowledgeAssets`);
            const q = query(assetsRef, orderBy("uploadedAt", "desc"));
            const snapshot = await getDocs(q);

            const loaded = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                uploadedAt: doc.data().uploadedAt?.toDate?.() || new Date(),
            })) as KnowledgeAsset[];

            setAssets(loaded);
        } catch (err) {
            console.error("Failed to load knowledge assets:", err);
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    const toggleAssetExpansion = useCallback((assetId: string) => {
        setExpandedAssets((prev) => {
            const next = new Set(prev);
            if (next.has(assetId)) next.delete(assetId);
            else next.add(assetId);
            return next;
        });
    }, []);

    const removeAsset = useCallback((assetId: string) => {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
    }, []);

    const addAsset = useCallback((asset: KnowledgeAsset) => {
        setAssets((prev) => [asset, ...prev]);
    }, []);

    const updateAsset = useCallback((assetId: string, updates: Partial<KnowledgeAsset>) => {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, ...updates } : a)));
    }, []);

    useEffect(() => {
        loadAssets();
    }, [loadAssets]);

    return {
        assets,
        isLoading,
        expandedAssets,
        loadAssets,
        toggleAssetExpansion,
        removeAsset,
        addAsset,
        updateAsset,
    };
}
