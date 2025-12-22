/**
 * Lead Types - Lead Capture Schema
 * 
 * Leads are captured from public chat sessions when users provide contact info.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// LEAD
// ============================================

export type LeadStatus = 'new' | 'contacted' | 'closed';

/**
 * Lead - Contact captured from public chat.
 * Lives at: businesses/{businessId}/leads/{leadId}
 */
export interface Lead {
    id: string;
    businessId: string; // Denormalized

    // Source
    sessionId: string; // The chat session that captured this lead

    // Contact info
    name: string;
    phoneE164: string;
    email?: string;
    message?: string; // Optional context

    // Status
    status: LeadStatus;

    // Audit
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

// ============================================
// LEAD DTOs
// ============================================

export interface CreateLeadRequest {
    sessionId: string;
    name: string;
    phoneE164: string;
    email?: string;
    message?: string;
}

export interface CreateLeadResponse {
    success: boolean;
    leadId?: string;
    message: string;
}

export interface ListLeadsResponse {
    leads: Lead[];
    total: number;
}
