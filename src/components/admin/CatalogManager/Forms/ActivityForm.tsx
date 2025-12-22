/**
 * ActivityForm - Shim for backwards compatibility
 *
 * DO NOT add more code here - use ActivityForm/ folder instead.
 */
// NOTE: Explicit leaf path avoids ESM resolving "./ActivityForm" back to this shim
// file (self-reexport cycle while resolving `default`).
export { default } from "./ActivityForm/ActivityForm";
