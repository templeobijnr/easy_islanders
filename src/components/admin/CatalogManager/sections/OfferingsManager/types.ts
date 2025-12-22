/**
 * OfferingsManager Types
 */
export type IngestKind =
    | "menuItems"
    | "services"
    | "offerings"
    | "tickets"
    | "roomTypes";

export interface IngestProposal {
    id: string;
    kind: IngestKind;
    status: "proposed" | "applied" | "rejected" | string;
    extractedItems?: Array<{
        id?: string;
        name: string;
        description?: string | null;
        price?: number | null;
        currency?: string | null;
        category?: string | null;
    }>;
    warnings?: string[];
    createdAt?: any;
}

export interface OfferingsManagerProps {
    listingId: string;
    listingTitle: string;
    marketId: string;
    kinds: IngestKind[];
    /** 'standalone' = full UI with tabs, 'inline' = compact for embedding */
    variant?: "standalone" | "inline";
    /** Label for inline mode header */
    actionLabel?: string;
}

export type ExtractionStatus = "idle" | "processing" | "complete" | "error";
