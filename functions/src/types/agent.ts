
import { MarketplaceDomain } from './enums';

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  domainFocus: MarketplaceDomain[];
  color: string;
  iconName: 'Building2' | 'Car' | 'Sparkles' | 'Utensils' | 'Hotel';
  avatarUrl: string;
}

// ============================================
// AGENT RESPONSE TYPES (Future-proof)
// ============================================

/**
 * AgentToolCall - Represents a tool invocation by the agent.
 * Used for structured agent responses with function calling.
 */
export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * AgentResponse - Structured response from the agent.
 * This is the internal representation; controllers transform to DTOs.
 */
export interface AgentResponse {
  text: string;
  toolCalls?: AgentToolCall[];
  sources?: Array<{
    docId: string;
    chunkId: string;
    sourceName: string;
    score: number;
  }>;
  cards?: unknown[]; // For rich UI cards (future)
}

/**
 * AgentContext - Context passed to agent execution.
 * Includes business knowledge and conversation history.
 */
export interface AgentContext {
  businessId: string;
  businessName: string;
  knowledgeChunks: string[];
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    text: string;
  }>;
}
