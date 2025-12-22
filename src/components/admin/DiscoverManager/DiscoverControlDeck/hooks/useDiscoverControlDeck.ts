/**
 * useDiscoverControlDeck - State and handlers for discover config management
 */
import { useState, useEffect, useCallback } from "react";
import {
    getDiscoverConfig,
    updateRegionVisibility,
    updateTabVisibility,
    updateCategoryVisibility,
    clearLocationsCache,
    resetDiscoverConfig,
} from "@/services/discoverConfigService";
import type { DiscoverConfig, RegionConfig, TabConfig } from "../types";

export function useDiscoverControlDeck() {
    const [config, setConfig] = useState<DiscoverConfig | null>(null);
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
    const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadConfig = useCallback(async () => {
        try {
            const c = await getDiscoverConfig();
            setConfig(c);
        } catch (err) {
            console.error("Failed to load config:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const handleRegionToggle = useCallback(async (regionId: string, currentValue: boolean) => {
        if (!config) return;
        setIsSaving(true);
        try {
            await updateRegionVisibility(regionId, !currentValue);
            setConfig((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    regions: prev.regions.map((r) => (r.id === regionId ? { ...r, visible: !currentValue } : r)),
                };
            });
        } catch (err) { console.error("Failed to update region:", err); }
        finally { setIsSaving(false); }
    }, [config]);

    const handleSubRegionToggle = useCallback(async (regionId: string, subRegionId: string, currentValue: boolean) => {
        if (!config) return;
        setIsSaving(true);
        try {
            const region = config.regions.find((r) => r.id === regionId);
            if (!region) return;
            const updatedSubs = region.subRegions?.map((s) => (s.id === subRegionId ? { ...s, visible: !currentValue } : s)) || [];
            await updateRegionVisibility(regionId, region.visible, updatedSubs);
            setConfig((prev) => {
                if (!prev) return prev;
                return { ...prev, regions: prev.regions.map((r) => (r.id === regionId ? { ...r, subRegions: updatedSubs } : r)) };
            });
        } catch (err) { console.error("Failed to update sub-region:", err); }
        finally { setIsSaving(false); }
    }, [config]);

    const handleTabToggle = useCallback(async (tabId: string, currentValue: boolean) => {
        if (!config) return;
        setIsSaving(true);
        try {
            await updateTabVisibility(tabId, !currentValue);
            setConfig((prev) => {
                if (!prev) return prev;
                return { ...prev, tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, visible: !currentValue } : t)) };
            });
        } catch (err) { console.error("Failed to update tab:", err); }
        finally { setIsSaving(false); }
    }, [config]);

    const handleCategoryToggle = useCallback(async (tabId: string, categoryId: string, currentValue: boolean) => {
        if (!config) return;
        setIsSaving(true);
        try {
            await updateCategoryVisibility(tabId, categoryId, !currentValue);
            setConfig((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((t) =>
                        t.id === tabId ? { ...t, categories: t.categories?.map((c) => (c.id === categoryId ? { ...c, visible: !currentValue } : c)) } : t
                    ),
                };
            });
        } catch (err) { console.error("Failed to update category:", err); }
        finally { setIsSaving(false); }
    }, [config]);

    const toggleRegionExpansion = useCallback((regionId: string) => {
        setExpandedRegions((prev) => {
            const next = new Set(prev);
            if (next.has(regionId)) next.delete(regionId);
            else next.add(regionId);
            return next;
        });
    }, []);

    const toggleTabExpansion = useCallback((tabId: string) => {
        setExpandedTabs((prev) => {
            const next = new Set(prev);
            if (next.has(tabId)) next.delete(tabId);
            else next.add(tabId);
            return next;
        });
    }, []);

    const handleClearCache = useCallback(async () => {
        setIsSaving(true);
        try {
            await clearLocationsCache();
            alert("Cache cleared!");
        } catch (err) { console.error("Failed to clear cache:", err); }
        finally { setIsSaving(false); }
    }, []);

    const handleReset = useCallback(async () => {
        if (!confirm("Reset all discover settings to defaults?")) return;
        setIsSaving(true);
        try {
            await resetDiscoverConfig();
            await loadConfig();
        } catch (err) { console.error("Failed to reset:", err); }
        finally { setIsSaving(false); }
    }, [loadConfig]);

    return {
        config,
        expandedRegions,
        expandedTabs,
        isLoading,
        isSaving,
        handleRegionToggle,
        handleSubRegionToggle,
        handleTabToggle,
        handleCategoryToggle,
        toggleRegionExpansion,
        toggleTabExpansion,
        handleClearCache,
        handleReset,
    };
}
