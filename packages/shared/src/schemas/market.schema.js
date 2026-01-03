"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MARKET_ID = exports.MarketIdSchema = void 0;
exports.assertValidMarketId = assertValidMarketId;
exports.parseMarketId = parseMarketId;
const zod_1 = require("zod");
/**
 * Supported market identifiers.
 * Extend this enum when expanding to new markets.
 */
exports.MarketIdSchema = zod_1.z.enum(['north-cyprus']);
/**
 * Default market for V1.
 * Used ONLY at the API boundary for resolution, never in business logic.
 */
exports.DEFAULT_MARKET_ID = 'north-cyprus';
/**
 * Type assertion helper for runtime validation.
 * Throws ZodError if the provided id is not a valid market.
 *
 * @param id - The string to validate
 * @throws ZodError if id is not a valid MarketId
 */
function assertValidMarketId(id) {
    exports.MarketIdSchema.parse(id);
}
/**
 * Safe parser that returns null for invalid market IDs.
 *
 * @param id - The string to validate
 * @returns MarketId if valid, null otherwise
 */
function parseMarketId(id) {
    const result = exports.MarketIdSchema.safeParse(id);
    return result.success ? result.data : null;
}
//# sourceMappingURL=market.schema.js.map