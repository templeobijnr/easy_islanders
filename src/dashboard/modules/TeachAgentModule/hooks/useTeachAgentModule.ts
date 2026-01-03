/**
 * useTeachAgentModule - ViewModel Hook
 *
 * Manages state and handlers for TeachAgentModule.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../../../../context/AuthContext";
import { logger } from "../../../../utils/logger";
import { v1ApiUrl } from "../../../../config/api";
import type { KnowledgeDoc, ManualItem, TeachAgentView, TeachAgentError } from "../types";
import { DEFAULT_MANUAL_ITEM } from "../types";

export function useTeachAgentModule() {
    const { firebaseUser, claims, logout, forceRefreshToken, isLoading: authLoading } = useAuth();
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<TeachAgentError | null>(null);

    // View states
    const [activeView, setActiveView] = useState<TeachAgentView>("options");
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [urlInput, setUrlInput] = useState("");
    const [manualItems, setManualItems] = useState<ManualItem[]>([DEFAULT_MANUAL_ITEM]);
    const [extractedCount, setExtractedCount] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const businessId = claims?.businessId ?? null;

    // API helpers
    const ownerApiUrl = (path: string) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        return v1ApiUrl(`/owner${normalized}`);
    };

    const getAuthToken = async () => {
        if (!firebaseUser) return null;
        return firebaseUser.getIdToken();
    };

    // Load docs
    const loadDocs = useCallback(async () => {
        if (!businessId) return;
        try {
            const token = await getAuthToken();
            const response = await fetch(ownerApiUrl("/knowledge-docs"), {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setDocs(data.docs || []);
                setError(null);
            } else if (response.status === 401) {
                setError({ title: "Session expired", detail: "Please log in again.", action: "Login", code: "UNAUTHORIZED" });
            } else if (response.status === 403) {
                await forceRefreshToken();
                const retryToken = await getAuthToken();
                const retryResponse = await fetch(ownerApiUrl("/knowledge-docs"), {
                    headers: { Authorization: `Bearer ${retryToken}` },
                });
                if (retryResponse.ok) {
                    const data = await retryResponse.json();
                    setDocs(data.docs || []);
                    setError(null);
                } else {
                    const err = await retryResponse.json();
                    setError({ title: "Access denied", detail: err.hint || err.error || "You may need to re-claim this business.", action: "Retry", code: err.code });
                }
            } else if (response.status === 400) {
                const err = await response.json();
                setError({ title: "Request error", detail: err.hint || err.error, action: "Retry" });
            }
        } catch (err: any) {
            logger.error("[TeachAgent] Failed to load docs", { message: err?.message });
            setError({ title: "Couldn't load knowledge", detail: err?.message || "Network error.", action: "Retry" });
        }
    }, [firebaseUser, businessId]);

    // File upload handler
    const handleFileUpload = useCallback(async (files: File[]) => {
        if (!businessId || files.length === 0) return;
        setIsSubmitting(true);
        let successCount = 0;

        try {
            const token = await getAuthToken();
            const storage = getStorage();

            for (const file of files) {
                const isImage = file.type.startsWith("image/");
                const isPdf = file.type === "application/pdf";
                const isText = file.type.startsWith("text/") || (file.name.split(".").pop() || "").toLowerCase() === "txt";

                if (!isImage && !isPdf && !isText) {
                    setError({ title: "Unsupported file type", detail: `Please upload image, PDF, or text. (${file.name})` });
                    continue;
                }

                let response: Response;
                if (isText) {
                    const text = await file.text();
                    response = await fetch(ownerApiUrl("/knowledge-docs"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ sourceType: "text", sourceName: file.name, text }),
                    });
                } else {
                    const docId = crypto.randomUUID();
                    const ext = file.name.split(".").pop() || "bin";
                    const filePath = `businesses/${businessId}/knowledge/${docId}/original.${ext}`;
                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);

                    response = await fetch(ownerApiUrl("/knowledge-docs"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ sourceType: isImage ? "image" : "pdf", sourceName: file.name, filePath, mimeType: file.type }),
                    });
                }
                if (response.ok) successCount++;
            }

            setExtractedCount(successCount);
            setActiveView("review");
            await loadDocs();
        } catch (error: any) {
            logger.error("[TeachAgent] Upload failed", { message: error?.message });
            setError({ title: "Upload failed", detail: error?.message || "Please try again." });
        } finally {
            setIsSubmitting(false);
            setUploadedFiles([]);
        }
    }, [businessId, loadDocs]);

    // URL import handler
    const handleUrlImport = useCallback(async () => {
        if (!urlInput.trim()) return;
        setIsSubmitting(true);

        try {
            const token = await getAuthToken();
            let hostname = "Website";
            try { hostname = new URL(urlInput).hostname.replace("www.", ""); } catch { }

            const response = await fetch(ownerApiUrl("/knowledge-docs"), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sourceType: "url", sourceName: hostname, sourceUrl: urlInput }),
            });

            if (response.ok) {
                setExtractedCount(1);
                setActiveView("review");
                setUrlInput("");
                await loadDocs();
            } else {
                const err = await response.json();
                setError({ title: "Import failed", detail: err.error || "Failed to import" });
            }
        } catch (error: any) {
            logger.error("[TeachAgent] URL import failed", { message: error?.message });
            setError({ title: "Invalid URL", detail: error?.message || "Invalid URL format" });
        } finally {
            setIsSubmitting(false);
        }
    }, [urlInput, loadDocs]);

    // Manual items save
    const handleSaveManualItems = useCallback(async () => {
        const validItems = manualItems.filter((i) => i.name.trim());
        if (validItems.length === 0) return;
        setIsSubmitting(true);

        try {
            const token = await getAuthToken();
            const text = validItems
                .map((item) => {
                    let line = `${item.type === "service" ? "Service" : "Product"}: ${item.name}`;
                    if (item.price) line += ` — ${item.price}`;
                    if (item.note) line += ` (${item.note})`;
                    return line;
                })
                .join("\n");

            const response = await fetch(ownerApiUrl("/knowledge-docs"), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sourceType: "text", sourceName: "Products & Services", text }),
            });

            if (response.ok) {
                setExtractedCount(validItems.length);
                setActiveView("review");
                setManualItems([DEFAULT_MANUAL_ITEM]);
                await loadDocs();
            }
        } catch (error: any) {
            logger.error("[TeachAgent] Save failed", { message: error?.message });
        } finally {
            setIsSubmitting(false);
        }
    }, [manualItems, loadDocs]);

    // Manual item helpers
    const addManualItem = useCallback(() => {
        setManualItems((prev) => [...prev, DEFAULT_MANUAL_ITEM]);
    }, []);

    const updateManualItem = useCallback((index: number, field: keyof ManualItem, value: string) => {
        setManualItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    // Auth validation
    useEffect(() => {
        if (authLoading) return;
        if (!firebaseUser) {
            setError({ title: "Session expired", detail: "Please log in again.", action: "Login", code: "UNAUTHORIZED" });
            setIsLoading(false);
            return;
        }
        if (claims?.role !== "owner" || !businessId) {
            setError({ title: "Business not claimed", detail: "Complete the claim flow to get access.", action: "Retry", code: "NO_BUSINESS_CLAIM" });
            setIsLoading(false);
            return;
        }
        setError(null);
        setIsLoading(false);
    }, [authLoading, firebaseUser, claims, businessId]);

    // Load on mount
    useEffect(() => {
        if (!businessId || loaded) return;
        setLoaded(true);
        loadDocs();
    }, [businessId, loaded, loadDocs]);

    // Poll for processing
    useEffect(() => {
        const processingDocs = docs.filter((d) => d.status === "processing");
        if (processingDocs.length === 0) return;
        const interval = setInterval(loadDocs, 3000);
        return () => clearInterval(interval);
    }, [docs, loadDocs]);

    // Stats
    const activeDocsCount = docs.filter((d) => d.status === "active").length;
    const processingCount = docs.filter((d) => d.status === "processing").length;
    const hasKnowledge = docs.length > 0;

    return {
        // Auth
        logout,
        // State
        docs,
        isLoading,
        isSubmitting,
        error,
        setError,
        setLoaded,
        // View
        activeView,
        setActiveView,
        // File upload
        uploadedFiles,
        setUploadedFiles,
        fileInputRef,
        handleFileUpload,
        // URL import
        urlInput,
        setUrlInput,
        handleUrlImport,
        // Manual items
        manualItems,
        addManualItem,
        updateManualItem,
        handleSaveManualItems,
        // Results
        extractedCount,
        // Stats
        activeDocsCount,
        processingCount,
        hasKnowledge,
    };
}
