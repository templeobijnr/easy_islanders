/**
 * MerveIntegrationSection - Shim for backwards compatibility
 */
// NOTE: Explicit leaf path avoids ESM resolving "./MerveIntegrationSection" back to this
// shim file (self-reexport cycle while resolving `default`).
export { default } from "./MerveIntegrationSection/MerveIntegrationSection";
export type { MerveIntegrationSectionProps, MerveConfig, MerveAction } from "./MerveIntegrationSection/types";
