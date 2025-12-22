/**
 * Tenant Types - Multi-Tenant Core Schema
 * 
 * These types define the foundational business ownership and tenancy model.
 * All business-scoped operations use TenantContext.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// TENANT CONTEXT (passed to all services)
// ============================================

/**
 * TenantContext is the first-class primitive for all service operations.
 * It is derived from the authenticated user's token claims or user document.
 * NEVER accept businessId from client payloads except for claim endpoints.
 */
export interface TenantContext {
    businessId: string;
    uid: string;
    role: 'owner'; // Future: 'admin' | 'manager' | 'viewer'
}

// ============================================
// BUSINESS ENTITY
// ============================================

export type ClaimStatus = 'unclaimed' | 'pending' | 'claimed';
export type BusinessStatus = 'active' | 'deleted';

/**
 * Business - The core tenant entity.
 * Lives at: businesses/{businessId}
 */
export interface Business {
    id: string;

    // Identity
    displayName: string;
    placeId?: string; // Google Maps Place ID

    // Market/Industry (for catalog extraction)
    marketId?: string; // e.g., 'nc.kyrenia', 'nc.famagusta'
    category?: string; // Industry domain e.g., 'food', 'beauty', 'retail'

    // Verification
    businessPhoneE164: string; // Phone from Google listing (for OTP)
    verifiedPhoneE164?: string; // Set after successful OTP verification

    // Claiming
    claimStatus: ClaimStatus;
    claimedByUid?: string;
    pendingClaimUid?: string;
    pendingExpiresAt?: Timestamp;

    // Lifecycle
    status: BusinessStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * BusinessMember - Future-proof for multi-user access.
 * Lives at: businesses/{businessId}/members/{uid}
 */
export interface BusinessMember {
    uid: string;
    role: 'owner'; // Future: 'admin' | 'manager' | 'viewer'
    status: 'active' | 'suspended';
    createdAt: Timestamp;
}

// ============================================
// USER (Tenant mapping)
// ============================================

/**
 * UserTenantInfo - Subset of user doc for tenant resolution.
 * Lives at: users/{uid}
 */
export interface UserTenantInfo {
    uid: string;
    businessId?: string; // Set after claim
    role?: 'owner';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// CLAIM DTOs
// ============================================

export interface ClaimStartRequest {
    businessId: string;
}

export interface ClaimStartResponse {
    success: boolean;
    message: string;
    expiresAt?: string; // ISO timestamp
}

export interface ClaimConfirmRequest {
    businessId: string;
    code: string; // OTP code
}

export interface ClaimConfirmResponse {
    success: boolean;
    message: string;
    businessId?: string;
}
