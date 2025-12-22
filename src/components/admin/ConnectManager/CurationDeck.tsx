/**
 * CurationDeck - Shim for backwards compatibility
 */
// NOTE: Explicit leaf path avoids ESM resolving "./CurationDeck" back to this shim
// file (self-reexport cycle while resolving `default`).
export { default } from "./CurationDeck/CurationDeck";
export type { CuratedItem, Venue, SectionId } from "./CurationDeck/types";
