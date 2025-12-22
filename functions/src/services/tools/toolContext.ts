/**
 * Tool Context
 *
 * Carries request-scoped context through all tool/service layers.
 * MarketContext is resolved ONCE at the API boundary and propagated here.
 *
 * INVARIANTS (architecture doc section 14.2):
 * 1. marketId is REQUIRED - fail fast if missing.
 * 2. Single resolution point at API boundary.
 * 3. Compile-time enforcement via TypeScript.
 */

import { type MarketId, MarketIdSchema } from '@askmerve/shared';

/**
 * Context passed to all tool functions.
 * marketId is required to enforce market scoping.
 */
export type ToolContext = {
  /** Required market identifier - resolved at API boundary */
  marketId: MarketId;
  /** Authenticated user ID (optional for anonymous discovery) */
  userId?: string;
  /** Session/conversation ID for stateful interactions */
  sessionId?: string;
  /** Channel the request originated from */
  channel?: 'app' | 'whatsapp' | 'discover' | string;
  /** User's current location for proximity operations */
  location?: { lat: number; lng: number };
  /** Extension point for additional context */
  [key: string]: unknown;
};

/**
 * Flexible input type for backward compatibility during migration.
 * Callers can pass full ToolContext or legacy userId string.
 */
export type UserIdOrToolContext = string | ToolContext | undefined;

/**
 * Converts legacy userId/sessionId to full ToolContext.
 * For new code, pass a full ToolContext directly.
 *
 * @param userIdOrContext - Legacy userId string or full ToolContext
 * @param sessionId - Optional session ID (legacy support)
 * @param defaultMarketId - Market to use if not provided in context
 */
export function asToolContext(
  userIdOrContext: UserIdOrToolContext,
  sessionId?: string,
  defaultMarketId: MarketId = 'north-cyprus'
): ToolContext {
  if (typeof userIdOrContext === 'object' && userIdOrContext !== null) {
    // Already a ToolContext - validate marketId exists
    if (!userIdOrContext.marketId) {
      throw new Error('ToolContext.marketId is required');
    }
    return {
      ...userIdOrContext,
      sessionId: (userIdOrContext.sessionId as string | undefined) ?? sessionId,
    };
  }
  // Legacy path: construct ToolContext from userId string
  return {
    marketId: defaultMarketId,
    userId: userIdOrContext,
    sessionId,
  };
}

/**
 * Fail-fast: extracts and validates userId from context.
 * Throws if userId is missing or invalid.
 */
export function requireToolUserId(ctx: ToolContext, toolName: string): string {
  if (!ctx.userId || typeof ctx.userId !== 'string') {
    throw new Error(`Unauthorized: ${toolName} requires a userId`);
  }
  return ctx.userId;
}

/**
 * Fail-fast: extracts and validates marketId from context.
 * Throws if marketId is missing or invalid.
 */
export function requireToolMarketId(ctx: ToolContext, toolName: string): MarketId {
  if (!ctx.marketId) {
    throw new Error(`${toolName} requires a marketId in ToolContext`);
  }
  // Validate it's a known market
  const result = MarketIdSchema.safeParse(ctx.marketId);
  if (!result.success) {
    throw new Error(`${toolName}: invalid marketId '${ctx.marketId}'`);
  }
  return result.data;
}
