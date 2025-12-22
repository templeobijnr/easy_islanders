/**
 * TeachAgentModule Types
 */
export interface KnowledgeDoc {
    id: string;
    sourceName: string;
    sourceType: string;
    status: "processing" | "active" | "failed" | "disabled";
    chunkCount: number;
}

export interface ManualItem {
    name: string;
    type: "product" | "service";
    price: string;
    note: string;
}

export type TeachAgentView = "options" | "upload" | "url" | "manual" | "review";

export interface TeachAgentError {
    title: string;
    detail: string;
    action?: string;
    code?: string;
}

export const DEFAULT_MANUAL_ITEM: ManualItem = {
    name: "",
    type: "product",
    price: "",
    note: "",
};
