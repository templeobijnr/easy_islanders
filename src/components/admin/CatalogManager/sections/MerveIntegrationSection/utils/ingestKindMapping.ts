/**
 * Ingest Kind Mapping Utilities
 * 
 * Maps between MerveIntegrationSection IngestKind and OfferingsManager IngestKind.
 * 
 * Why mapping is needed:
 * - MerveIntegrationSection uses semantic labels (menu, rooms)
 * - OfferingsManager uses collection-style names (menuItems, roomTypes)
 * - This mapping provides the translation layer
 */
import type { IngestKind } from "../types";
import type { IngestKind as OfferingsIngestKind } from "../../OfferingsManager/types";

/**
 * Map semantic Merve kind to OfferingsManager kind
 */
export const MERVE_TO_OFFERINGS_KIND_MAP: Record<IngestKind, OfferingsIngestKind> = {
    menuItems: "menuItems",
    roomTypes: "roomTypes",
    services: "services",
    offerings: "offerings",
    tickets: "tickets",
};

/**
 * Default offerings kinds when none specified
 */
export const DEFAULT_OFFERINGS_KINDS: OfferingsIngestKind[] = ["offerings"];

/**
 * Map a Merve IngestKind to OfferingsManager IngestKind
 * Pure function with no side effects
 */
export function mapMerveKindToOfferingsKind(merveKind: IngestKind): OfferingsIngestKind {
    return MERVE_TO_OFFERINGS_KIND_MAP[merveKind] || "offerings";
}
