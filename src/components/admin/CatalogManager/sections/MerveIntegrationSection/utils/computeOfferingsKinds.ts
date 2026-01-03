/**
 * Compute Offerings Kinds Utility
 * 
 * Pure function for computing kinds from enabled actions.
 */
import type { MerveAction, IngestKind } from "../types";
import type { IngestKind as OfferingsIngestKind } from "../../OfferingsManager/types";
import { mapMerveKindToOfferingsKind, DEFAULT_OFFERINGS_KINDS } from "./ingestKindMapping";

/**
 * Compute unique offerings kinds from enabled actions with data kinds
 * 
 * @param actions - Array of Merve actions
 * @param mapKind - Optional custom mapping function (defaults to mapMerveKindToOfferingsKind)
 * @returns Array of unique OfferingsManager kinds, or DEFAULT_OFFERINGS_KINDS if empty
 */
export function computeOfferingsKindsFromActions(
    actions: MerveAction[],
    mapKind: (kind: IngestKind) => OfferingsIngestKind = mapMerveKindToOfferingsKind
): OfferingsIngestKind[] {
    const enabledWithData = actions.filter(a => a.enabled && a.data?.kind);

    if (enabledWithData.length === 0) {
        return DEFAULT_OFFERINGS_KINDS;
    }

    const kinds = enabledWithData
        .map(a => mapKind(a.data!.kind!))
        .filter((kind, index, self) => self.indexOf(kind) === index); // Deduplicate

    return kinds.length > 0 ? kinds : DEFAULT_OFFERINGS_KINDS;
}
