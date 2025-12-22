/**
 * ExperienceForm - Shim for backwards compatibility
 */
// NOTE: Explicit leaf path avoids ESM resolving "./ExperienceForm" back to this shim
// file (self-reexport cycle while resolving `default`).
export { default } from "./ExperienceForm/ExperienceForm";
