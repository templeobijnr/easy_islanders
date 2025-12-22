/**
 * @askmerve/contracts - Identity Module DTOs
 *
 * Auth-related types and claims for mobile/web transport.
 *
 * IMPORTANT: These are DTOs only - no business logic.
 * For full User entity handling, see functions/src/modules/identity/
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(['user', 'provider', 'admin', 'superadmin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserTypeSchema = z.enum(['personal', 'business']);
export type UserType = z.infer<typeof UserTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER CLAIMS (Auth Token Claims)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User claims extracted from Firebase Auth token.
 * These are available on the client after authentication.
 */
export const UserClaimsSchema = z.object({
    uid: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: UserRoleSchema.default('user'),
    isAdmin: z.boolean().default(false),
});

export type UserClaims = z.infer<typeof UserClaimsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT (For API Requests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticated user context passed with API requests.
 * Populated from Firebase Auth token on the backend.
 */
export const AuthContextSchema = z.object({
    uid: z.string(),
    email: z.string().email().optional(),
    role: UserRoleSchema,
    isAdmin: z.boolean(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE DTO (Client-facing subset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public user profile returned to clients.
 * Does not include sensitive fields like email or phone.
 */
export const UserProfileDTOSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    photoURL: z.string().optional(),
    bio: z.string().optional(),
    isIslander: z.boolean().default(false),
    userType: UserTypeSchema.default('personal'),
});

export type UserProfileDTO = z.infer<typeof UserProfileDTOSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SESSION INFO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Current session information for the authenticated user.
 */
export const SessionInfoSchema = z.object({
    userId: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    displayName: z.string().optional(),
    photoURL: z.string().optional(),
    role: UserRoleSchema,
    isAdmin: z.boolean(),
    expiresAt: z.string(), // ISO string
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;
