"use strict";
/**
 * @askmerve/shared - Shared types, schemas, and utilities for AskMerve V1
 *
 * This package provides:
 * - Zod schemas for validation
 * - TypeScript types inferred from schemas
 * - Utility functions for common operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeTokenResponseSchema = exports.ExchangeTokenRequestSchema = exports.CreateMerchantTokenResponseSchema = exports.CreateMerchantTokenRequestSchema = exports.MerchantSessionSchema = exports.MerchantTokenSchema = exports.MerchantTokenScopeSchema = exports.getListingDispatchPhone = exports.listingSupportsAction = exports.ListingSchema = exports.PlaceTypeSchema = exports.MessageSchema = exports.MessageContentTypeSchema = exports.ConversationSchema = exports.ChannelSchema = exports.ConversationTypeSchema = exports.generateJobCode = exports.validateJobForDispatch = exports.isValidJobTransition = exports.JOB_STATUS_TRANSITIONS = exports.MessageSourceSchema = exports.MerchantTargetSchema = exports.UnlistedMerchantTargetSchema = exports.ListedMerchantTargetSchema = exports.CreateJobInputSchema = exports.JobSchema = exports.JobStatusSchema = exports.actionRequiresDateTime = exports.actionRequiresLocation = exports.InquireActionDataSchema = exports.BookStayActionDataSchema = exports.BookActivityActionDataSchema = exports.RequestServiceActionDataSchema = exports.BookServiceActionDataSchema = exports.ReserveTableActionDataSchema = exports.OrderGroceryActionDataSchema = exports.OrderWaterGasActionDataSchema = exports.TaxiActionDataSchema = exports.OrderFoodActionDataSchema = exports.ActionDataSchema = exports.ActionTypeSchema = exports.parseMarketId = exports.assertValidMarketId = exports.DEFAULT_MARKET_ID = exports.MarketIdSchema = exports.createGoogleMapsDirectionsLink = exports.createGoogleMapsLinkFromLocation = exports.createGoogleMapsLink = exports.LocationSchema = exports.CoordinatesSchema = void 0;
// =============================================================================
// LOCATION
// =============================================================================
var location_schema_1 = require("./schemas/location.schema");
Object.defineProperty(exports, "CoordinatesSchema", { enumerable: true, get: function () { return location_schema_1.CoordinatesSchema; } });
Object.defineProperty(exports, "LocationSchema", { enumerable: true, get: function () { return location_schema_1.LocationSchema; } });
Object.defineProperty(exports, "createGoogleMapsLink", { enumerable: true, get: function () { return location_schema_1.createGoogleMapsLink; } });
Object.defineProperty(exports, "createGoogleMapsLinkFromLocation", { enumerable: true, get: function () { return location_schema_1.createGoogleMapsLinkFromLocation; } });
Object.defineProperty(exports, "createGoogleMapsDirectionsLink", { enumerable: true, get: function () { return location_schema_1.createGoogleMapsDirectionsLink; } });
// =============================================================================
// MARKET
// =============================================================================
var market_schema_1 = require("./schemas/market.schema");
Object.defineProperty(exports, "MarketIdSchema", { enumerable: true, get: function () { return market_schema_1.MarketIdSchema; } });
Object.defineProperty(exports, "DEFAULT_MARKET_ID", { enumerable: true, get: function () { return market_schema_1.DEFAULT_MARKET_ID; } });
Object.defineProperty(exports, "assertValidMarketId", { enumerable: true, get: function () { return market_schema_1.assertValidMarketId; } });
Object.defineProperty(exports, "parseMarketId", { enumerable: true, get: function () { return market_schema_1.parseMarketId; } });
// =============================================================================
// ACTIONS
// =============================================================================
var action_schema_1 = require("./schemas/action.schema");
Object.defineProperty(exports, "ActionTypeSchema", { enumerable: true, get: function () { return action_schema_1.ActionTypeSchema; } });
Object.defineProperty(exports, "ActionDataSchema", { enumerable: true, get: function () { return action_schema_1.ActionDataSchema; } });
Object.defineProperty(exports, "OrderFoodActionDataSchema", { enumerable: true, get: function () { return action_schema_1.OrderFoodActionDataSchema; } });
Object.defineProperty(exports, "TaxiActionDataSchema", { enumerable: true, get: function () { return action_schema_1.TaxiActionDataSchema; } });
Object.defineProperty(exports, "OrderWaterGasActionDataSchema", { enumerable: true, get: function () { return action_schema_1.OrderWaterGasActionDataSchema; } });
Object.defineProperty(exports, "OrderGroceryActionDataSchema", { enumerable: true, get: function () { return action_schema_1.OrderGroceryActionDataSchema; } });
Object.defineProperty(exports, "ReserveTableActionDataSchema", { enumerable: true, get: function () { return action_schema_1.ReserveTableActionDataSchema; } });
Object.defineProperty(exports, "BookServiceActionDataSchema", { enumerable: true, get: function () { return action_schema_1.BookServiceActionDataSchema; } });
Object.defineProperty(exports, "RequestServiceActionDataSchema", { enumerable: true, get: function () { return action_schema_1.RequestServiceActionDataSchema; } });
Object.defineProperty(exports, "BookActivityActionDataSchema", { enumerable: true, get: function () { return action_schema_1.BookActivityActionDataSchema; } });
Object.defineProperty(exports, "BookStayActionDataSchema", { enumerable: true, get: function () { return action_schema_1.BookStayActionDataSchema; } });
Object.defineProperty(exports, "InquireActionDataSchema", { enumerable: true, get: function () { return action_schema_1.InquireActionDataSchema; } });
Object.defineProperty(exports, "actionRequiresLocation", { enumerable: true, get: function () { return action_schema_1.actionRequiresLocation; } });
Object.defineProperty(exports, "actionRequiresDateTime", { enumerable: true, get: function () { return action_schema_1.actionRequiresDateTime; } });
// =============================================================================
// JOBS
// =============================================================================
var job_schema_1 = require("./schemas/job.schema");
Object.defineProperty(exports, "JobStatusSchema", { enumerable: true, get: function () { return job_schema_1.JobStatusSchema; } });
Object.defineProperty(exports, "JobSchema", { enumerable: true, get: function () { return job_schema_1.JobSchema; } });
Object.defineProperty(exports, "CreateJobInputSchema", { enumerable: true, get: function () { return job_schema_1.CreateJobInputSchema; } });
Object.defineProperty(exports, "ListedMerchantTargetSchema", { enumerable: true, get: function () { return job_schema_1.ListedMerchantTargetSchema; } });
Object.defineProperty(exports, "UnlistedMerchantTargetSchema", { enumerable: true, get: function () { return job_schema_1.UnlistedMerchantTargetSchema; } });
Object.defineProperty(exports, "MerchantTargetSchema", { enumerable: true, get: function () { return job_schema_1.MerchantTargetSchema; } });
Object.defineProperty(exports, "MessageSourceSchema", { enumerable: true, get: function () { return job_schema_1.MessageSourceSchema; } });
Object.defineProperty(exports, "JOB_STATUS_TRANSITIONS", { enumerable: true, get: function () { return job_schema_1.JOB_STATUS_TRANSITIONS; } });
Object.defineProperty(exports, "isValidJobTransition", { enumerable: true, get: function () { return job_schema_1.isValidJobTransition; } });
Object.defineProperty(exports, "validateJobForDispatch", { enumerable: true, get: function () { return job_schema_1.validateJobForDispatch; } });
Object.defineProperty(exports, "generateJobCode", { enumerable: true, get: function () { return job_schema_1.generateJobCode; } });
// =============================================================================
// CONVERSATIONS
// =============================================================================
var conversation_schema_1 = require("./schemas/conversation.schema");
Object.defineProperty(exports, "ConversationTypeSchema", { enumerable: true, get: function () { return conversation_schema_1.ConversationTypeSchema; } });
Object.defineProperty(exports, "ChannelSchema", { enumerable: true, get: function () { return conversation_schema_1.ChannelSchema; } });
Object.defineProperty(exports, "ConversationSchema", { enumerable: true, get: function () { return conversation_schema_1.ConversationSchema; } });
Object.defineProperty(exports, "MessageContentTypeSchema", { enumerable: true, get: function () { return conversation_schema_1.MessageContentTypeSchema; } });
Object.defineProperty(exports, "MessageSchema", { enumerable: true, get: function () { return conversation_schema_1.MessageSchema; } });
// =============================================================================
// LISTINGS
// =============================================================================
var listing_schema_1 = require("./schemas/listing.schema");
Object.defineProperty(exports, "PlaceTypeSchema", { enumerable: true, get: function () { return listing_schema_1.PlaceTypeSchema; } });
Object.defineProperty(exports, "ListingSchema", { enumerable: true, get: function () { return listing_schema_1.ListingSchema; } });
Object.defineProperty(exports, "listingSupportsAction", { enumerable: true, get: function () { return listing_schema_1.listingSupportsAction; } });
Object.defineProperty(exports, "getListingDispatchPhone", { enumerable: true, get: function () { return listing_schema_1.getListingDispatchPhone; } });
// =============================================================================
// MERCHANT TOKENS
// =============================================================================
var merchant_token_schema_1 = require("./schemas/merchant-token.schema");
Object.defineProperty(exports, "MerchantTokenScopeSchema", { enumerable: true, get: function () { return merchant_token_schema_1.MerchantTokenScopeSchema; } });
Object.defineProperty(exports, "MerchantTokenSchema", { enumerable: true, get: function () { return merchant_token_schema_1.MerchantTokenSchema; } });
Object.defineProperty(exports, "MerchantSessionSchema", { enumerable: true, get: function () { return merchant_token_schema_1.MerchantSessionSchema; } });
Object.defineProperty(exports, "CreateMerchantTokenRequestSchema", { enumerable: true, get: function () { return merchant_token_schema_1.CreateMerchantTokenRequestSchema; } });
Object.defineProperty(exports, "CreateMerchantTokenResponseSchema", { enumerable: true, get: function () { return merchant_token_schema_1.CreateMerchantTokenResponseSchema; } });
Object.defineProperty(exports, "ExchangeTokenRequestSchema", { enumerable: true, get: function () { return merchant_token_schema_1.ExchangeTokenRequestSchema; } });
Object.defineProperty(exports, "ExchangeTokenResponseSchema", { enumerable: true, get: function () { return merchant_token_schema_1.ExchangeTokenResponseSchema; } });
//# sourceMappingURL=index.js.map