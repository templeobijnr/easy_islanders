/**
 * @askmerve/shared - Shared types, schemas, and utilities for AskMerve V1
 * 
 * This package provides:
 * - Zod schemas for validation
 * - TypeScript types inferred from schemas
 * - Utility functions for common operations
 */

// =============================================================================
// LOCATION
// =============================================================================
export {
    CoordinatesSchema,
    LocationSchema,
    createGoogleMapsLink,
    createGoogleMapsLinkFromLocation,
    createGoogleMapsDirectionsLink,
    type Coordinates,
    type Location,
} from './schemas/location.schema';

// =============================================================================
// MARKET
// =============================================================================
export {
    MarketIdSchema,
    DEFAULT_MARKET_ID,
    assertValidMarketId,
    parseMarketId,
    type MarketId,
} from './schemas/market.schema';

// =============================================================================
// ACTIONS
// =============================================================================
export {
    ActionTypeSchema,
    ActionDataSchema,
    OrderFoodActionDataSchema,
    TaxiActionDataSchema,
    OrderWaterGasActionDataSchema,
    OrderGroceryActionDataSchema,
    ReserveTableActionDataSchema,
    BookServiceActionDataSchema,
    RequestServiceActionDataSchema,
    BookActivityActionDataSchema,
    BookStayActionDataSchema,
    InquireActionDataSchema,
    actionRequiresLocation,
    actionRequiresDateTime,
    type ActionType,
    type ActionData,
    type OrderFoodActionData,
    type TaxiActionData,
    type OrderWaterGasActionData,
    type OrderGroceryActionData,
    type ReserveTableActionData,
    type BookServiceActionData,
    type RequestServiceActionData,
    type BookActivityActionData,
    type BookStayActionData,
    type InquireActionData,
} from './schemas/action.schema';

// =============================================================================
// JOBS
// =============================================================================
export {
    JobStatusSchema,
    JobSchema,
    CreateJobInputSchema,
    ListedMerchantTargetSchema,
    UnlistedMerchantTargetSchema,
    MerchantTargetSchema,
    MessageSourceSchema,
    JOB_STATUS_TRANSITIONS,
    isValidJobTransition,
    validateJobForDispatch,
    generateJobCode,
    type JobStatus,
    type Job,
    type CreateJobInput,
    type ListedMerchantTarget,
    type UnlistedMerchantTarget,
    type MerchantTarget,
    type MessageSource,
} from './schemas/job.schema';

// =============================================================================
// CONVERSATIONS
// =============================================================================
export {
    ConversationTypeSchema,
    ChannelSchema,
    ConversationSchema,
    MessageContentTypeSchema,
    MessageSchema,
    type ConversationType,
    type Channel,
    type Conversation,
    type MessageContentType,
    type Message,
} from './schemas/conversation.schema';

// =============================================================================
// LISTINGS
// =============================================================================
export {
    PlaceTypeSchema,
    ListingSchema,
    listingSupportsAction,
    getListingDispatchPhone,
    type PlaceType,
    type Listing,
} from './schemas/listing.schema';

// =============================================================================
// MERCHANT TOKENS
// =============================================================================
export {
    MerchantTokenScopeSchema,
    MerchantTokenSchema,
    MerchantSessionSchema,
    CreateMerchantTokenRequestSchema,
    CreateMerchantTokenResponseSchema,
    ExchangeTokenRequestSchema,
    ExchangeTokenResponseSchema,
    type MerchantTokenScope,
    type MerchantToken,
    type MerchantSession,
    type CreateMerchantTokenRequest,
    type CreateMerchantTokenResponse,
    type ExchangeTokenRequest,
    type ExchangeTokenResponse,
} from './schemas/merchant-token.schema';
