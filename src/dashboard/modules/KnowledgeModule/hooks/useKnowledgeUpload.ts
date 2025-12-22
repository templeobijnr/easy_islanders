/**
 * useKnowledgeUpload - File/URL/Text upload handlers
 */
import { useCallback, useState } from "react";
import { getAuth } from "firebase/auth";
import { v1ApiUrl } from "../../../../config/api";
import type { KnowledgeAsset } from "../types";

interface UseKnowledgeUploadOptions {
    businessId: string | null;
    onAssetAdd: (asset: KnowledgeAsset) => void;
    onAssetUpdate: (id: string, updates: Partial<KnowledgeAsset>) => void;
}

export function useKnowledgeUpload({ businessId, onAssetAdd, onAssetUpdate }: UseKnowledgeUploadOptions) {
    const [isUploading, setIsUploading] = useState(false);

    const getAuthToken = useCallback(async (): Promise<string | null> => {
        const auth = getAuth();
        return auth.currentUser?.getIdToken() || null;
    }, []);

    const fileToBase64 = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }, []);

    const handleFiles = useCallback(async (files: FileList) => {
        if (!businessId) return;
        setIsUploading(true);

        for (const file of Array.from(files)) {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const isImage = file.type.startsWith("image/");
            const isPdf = file.type === "application/pdf";

            const tempAsset: KnowledgeAsset = {
                id: tempId,
                name: file.name,
                type: "other",
                fileType: isImage ? "image" : isPdf ? "pdf" : "text",
                status: "uploading",
                uploadedAt: new Date(),
            };

            if (isImage) {
                tempAsset.preview = URL.createObjectURL(file);
            }

            onAssetAdd(tempAsset);

            try {
                const token = await getAuthToken();
                const base64 = await fileToBase64(file);

                const res = await fetch(v1ApiUrl("/admin/knowledge/upload"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ businessId, fileName: file.name, fileType: file.type, base64Data: base64.split(",")[1] }),
                });

                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();

                onAssetUpdate(tempId, { id: data.assetId || tempId, status: "processing" });

                // Poll for completion
                let attempts = 0;
                const poll = setInterval(async () => {
                    attempts++;
                    if (attempts > 30) { clearInterval(poll); onAssetUpdate(tempId, { status: "ready" }); return; }
                    try {
                        const statusRes = await fetch(v1ApiUrl(`/admin/knowledge/${data.assetId || tempId}/status`), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            if (statusData.status === "ready" || statusData.status === "error") {
                                clearInterval(poll);
                                onAssetUpdate(tempId, { status: statusData.status, chunks: statusData.chunks });
                            }
                        }
                    } catch { }
                }, 2000);
            } catch (err) {
                console.error("File upload failed:", err);
                onAssetUpdate(tempId, { status: "error" });
            }
        }

        setIsUploading(false);
    }, [businessId, getAuthToken, fileToBase64, onAssetAdd, onAssetUpdate]);

    const handleUrlSubmit = useCallback(async (url: string) => {
        if (!businessId || !url.trim()) return;
        setIsUploading(true);

        const tempId = `temp_url_${Date.now()}`;
        const tempAsset: KnowledgeAsset = { id: tempId, name: url, type: "other", fileType: "url", status: "uploading", uploadedAt: new Date() };
        onAssetAdd(tempAsset);

        try {
            const token = await getAuthToken();
            const res = await fetch(v1ApiUrl("/admin/knowledge/url"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ businessId, url }),
            });
            if (!res.ok) throw new Error("URL import failed");
            const data = await res.json();
            onAssetUpdate(tempId, { id: data.assetId || tempId, status: "ready", chunks: data.chunks });
        } catch (err) {
            console.error("URL import failed:", err);
            onAssetUpdate(tempId, { status: "error" });
        } finally {
            setIsUploading(false);
        }
    }, [businessId, getAuthToken, onAssetAdd, onAssetUpdate]);

    const handleTextSubmit = useCallback(async (title: string, content: string) => {
        if (!businessId || !content.trim()) return;
        setIsUploading(true);

        const tempId = `temp_text_${Date.now()}`;
        const tempAsset: KnowledgeAsset = { id: tempId, name: title || "Manual Entry", type: "other", fileType: "text", status: "uploading", uploadedAt: new Date() };
        onAssetAdd(tempAsset);

        try {
            const token = await getAuthToken();
            const res = await fetch(v1ApiUrl("/admin/knowledge/text"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ businessId, title, content }),
            });
            if (!res.ok) throw new Error("Text submit failed");
            const data = await res.json();
            onAssetUpdate(tempId, { id: data.assetId || tempId, status: "ready", chunks: data.chunks });
        } catch (err) {
            console.error("Text submit failed:", err);
            onAssetUpdate(tempId, { status: "error" });
        } finally {
            setIsUploading(false);
        }
    }, [businessId, getAuthToken, onAssetAdd, onAssetUpdate]);

    return { isUploading, handleFiles, handleUrlSubmit, handleTextSubmit };
}
