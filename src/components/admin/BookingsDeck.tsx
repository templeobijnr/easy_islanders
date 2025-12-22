/**
 * BookingsDeck - Shim for backwards compatibility
 */
// NOTE: Explicit leaf path avoids ESM resolving "./BookingsDeck" back to this shim
// file (self-reexport cycle while resolving `default`).
export { default } from "./BookingsDeck/BookingsDeck";
export type { BookingWithStay } from "./BookingsDeck/types";
