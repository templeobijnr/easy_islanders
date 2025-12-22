/**
 * Market Schema
 * Defines market/city identifiers for multi-market support.
 *
 * INVARIANTS (from architecture doc section 14.2):
 * 1. MarketContext is Required for all market-scoped data operations.
 * 2. MarketContext resolved ONCE at API boundary, propagated to all layers.
 * 3. Fail-fast if MarketContext is missing or ambiguous.
 * 4. No inline defaults - hardcoded market IDs are FORBIDDEN in business logic.
 * 5. Compile-time enforcement - omitting marketId is a TypeScript error.
 */

import { z } from 'zod';

/**
 * Supported market identifiers.
 * Extend this enum when expanding to new markets.
 */
export const MarketIdSchema = z.enum(['north-cyprus']);

/**
 * MarketId type - must be one of the supported markets.
 */
export type MarketId = z.infer<typeof MarketIdSchema>;

/**
 * Default market for V1.
 * Used ONLY at the API boundary for resolution, never in business logic.
 */
export const DEFAULT_MARKET_ID: MarketId = 'north-cyprus';

/**
 * Type assertion helper for runtime validation.
 * Throws ZodError if the provided id is not a valid market.
 *
 * @param id - The string to validate
 * @throws ZodError if id is not a valid MarketId
 */
export function assertValidMarketId(id: string): asserts id is MarketId {
    MarketIdSchema.parse(id);
}

/**
 * Safe parser that returns null for invalid market IDs.
 *
 * @param id - The string to validate
 * @returns MarketId if valid, null otherwise
 */
export function parseMarketId(id: string): MarketId | null {
    const result = MarketIdSchema.safeParse(id);
    return result.success ? result.data : null;
}
