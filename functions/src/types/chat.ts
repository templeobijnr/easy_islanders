
import { UnifiedItem } from './marketplace';
import { Booking } from './booking';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  recommendedItems?: UnifiedItem[];
  booking?: Booking;
  paymentRequest?: boolean;
  whatsappTriggered?: boolean;
}

export interface StoredMessage {
  role: 'user' | 'model' | 'system';
  parts: { text?: string }[];
  timestamp: Date;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
}

// ============================================
// MULTI-TENANT CHAT TYPES (V1)
// ============================================

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Chat session kind - distinguishes public widget chat from owner chat.
 */
export type ChatSessionKind = 'public' | 'owner';

/**
 * BusinessChatSession - Multi-tenant chat session.
 * Lives at: businesses/{businessId}/chatSessions/{sessionId}
 * 
 * NOTE: This is separate from the legacy ChatSession above which is for
 * the platform concierge agent (user-scoped, not business-scoped).
 */
export interface BusinessChatSession {
  id: string;
  businessId: string;

  // Session type
  kind: ChatSessionKind;

  // Identity
  anonUid?: string; // For public sessions (anonymous auth)
  userId?: string;  // For owner sessions
  customerName?: string;

  // State
  status: 'open' | 'closed';
  messageCount: number;
  lastMessage?: string;
  lastMessageAt: Timestamp;

  // Lead tracking
  leadCaptured: boolean;
  leadId?: string;

  // Audit
  createdAt: Timestamp;
}

/**
 * BusinessChatMessage - Message in a business chat session.
 * Lives at: businesses/{businessId}/chatSessions/{sessionId}/messages/{messageId}
 */
export interface BusinessChatMessage {
  id: string;

  // Content
  role: 'user' | 'assistant';
  text: string;

  // Sources (for RAG citations)
  sources?: Array<{
    docId: string;
    chunkId: string;
    sourceName: string;
    score: number;
  }>;

  // Metadata
  meta?: {
    model?: string;
    latencyMs?: number;
    toolsExecuted?: string[];
  };

  // Audit
  createdAt: Timestamp;
}

// ============================================
// PUBLIC CHAT DTOs
// ============================================

export interface CreateSessionRequest {
  businessId: string;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  greeting?: string;
}

export interface SendMessageRequest {
  businessId: string;
  sessionId: string;
  text: string;
}

export interface SendMessageResponse {
  success: boolean;
  text: string;
  sources?: Array<{
    sourceName: string;
    score: number;
  }>;
  error?: string;
  limitReached?: boolean;
}
