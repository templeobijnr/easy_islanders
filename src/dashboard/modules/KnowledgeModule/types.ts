/**
 * KnowledgeModule - Types
 */
export type TabType = "upload" | "url" | "text";

export interface KnowledgeAsset {
    id: string;
    name: string;
    type: "menu" | "price_list" | "policy" | "other";
    fileType: "image" | "pdf" | "text" | "url";
    preview?: string;
    status: "uploading" | "processing" | "ready" | "error";
    chunks?: number;
    chunkData?: Array<{
        id: string;
        text: string;
        preview: string;
    }>;
    uploadedAt: Date;
}

export interface UploadProgress {
    assetId: string;
    progress: number;
    status: "uploading" | "processing" | "complete" | "error";
    message?: string;
}
