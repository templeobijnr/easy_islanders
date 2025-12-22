/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for User data shape.
 * NO Firebase imports. NO business logic.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(["user", "provider", "admin", "superadmin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserTypeSchema = z.enum(["personal", "business"]);
export type UserType = z.infer<typeof UserTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
    street: z.string().optional(),
    city: z.string(),
    region: z.string(),
    country: z.string(),
    postalCode: z.string().optional(),
    coordinates: z
        .object({
            lat: z.number(),
            lng: z.number(),
        })
        .optional(),
});

export type Address = z.infer<typeof AddressSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const UserSettingsSchema = z.object({
    notifications: z.object({
        email: z.boolean().default(true),
        push: z.boolean().default(true),
        marketing: z.boolean().default(false),
    }),
    currency: z.string().default("GBP"),
    language: z.string().default("en"),
    privacy: z.enum(["public", "friends", "private"]).default("public"),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE (Extended)
// ─────────────────────────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
    bio: z.string().optional(),
    interests: z.array(z.string()).optional(),
    socialHandle: z.string().optional(),
    isIslander: z.boolean().default(false),
    joinDate: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER (Core Entity)
// ─────────────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
    // Identity
    id: z.string(),
    email: z.string().email(),
    phone: z.string(),
    displayName: z.string().optional(),
    photoURL: z.string().url().optional(),

    // Location
    address: AddressSchema,

    // Role & Type
    role: UserRoleSchema,
    userType: UserTypeSchema.default("personal"),
    businessName: z.string().optional(),

    // Settings & Profile
    settings: UserSettingsSchema.optional(),
    profile: UserProfileSchema.optional(),

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
    lastLoginAt: z.date().optional(),

    // Status
    isActive: z.boolean().default(true),
    isVerified: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS (for API validation)
// ─────────────────────────────────────────────────────────────────────────────

export const CreateUserInputSchema = UserSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true,
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const UpdateUserInputSchema = UserSchema.partial().omit({
    id: true,
    createdAt: true,
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT (passed from functions to controllers)
// ─────────────────────────────────────────────────────────────────────────────

export const AuthContextSchema = z.object({
    uid: z.string(),
    email: z.string().email().optional(),
    role: UserRoleSchema,
    isAdmin: z.boolean(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;
