/**
 * MessagesView - Shim for backwards compatibility
 */
// NOTE: Explicit leaf path avoids ESM resolving "./MessagesView" back to this
// shim file (self-reexport cycle).
export { default } from "./MessagesView/MessagesView";
export type { BookingSummary, BookingMessage } from "./MessagesView/types";
