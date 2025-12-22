/**
 * PlaceForm - Shim for backwards compatibility
 *
 * DO NOT add more code here - use PlaceForm/ folder instead.
 * This file exists only to preserve existing import paths.
 */
// NOTE: Explicit leaf path avoids ESM resolving "./PlaceForm" back to this shim
// file (self-reexport cycle / missing named export).
export { default } from "./PlaceForm/PlaceForm";
export type { PlaceFormProps, PlaceFormState } from "./PlaceForm/types";
