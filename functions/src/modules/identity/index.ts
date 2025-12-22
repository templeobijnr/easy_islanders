/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Identity module.
 */

// Schemas & Types
export * from "./identity.schema";

// Service (internal use)
export { IdentityService } from "./identity.service";

// Controller (internal use)
export { IdentityController } from "./identity.controller";

// Cloud Functions (exported to index.ts)
export {
    getUser,
    getMyProfile,
    updateProfile,
    deactivateAccount,
} from "./identity.functions";
