/**
 * Tool Service - Unified Tool Resolver
 *
 * This file serves as the main entry point for all tool resolvers.
 * It re-exports the modular tool services for backward compatibility.
 *
 * Architecture:
 * - Original monolithic implementation backed up to toolService.ORIGINAL.ts
 * - Now uses modular services from ./tools/ directory
 * - Each domain (taxi, booking, search, etc.) has its own module
 *
 * Benefits:
 * - Faster Cloud Functions cold starts (dynamic imports)
 * - Better code organization and maintainability
 * - Easier testing and debugging
 * - Clear separation of concerns
 *
 * @see ./tools/index.ts for the modular implementation
 */

// Export the unified tool resolvers from the modular structure
export { toolResolvers } from './tools';

// Also export individual modules for granular imports
export {
    taxiTools,
    bookingTools,
    searchTools,
    communicationTools,
    miscTools
} from './tools';

/**
 * Type Definitions
 * Re-export tool argument types for convenience
 */
export type {
    RequestTaxiArgs,
    DispatchTaxiArgs,
    CreateBookingArgs,
    ScheduleViewingArgs,
    SearchListingsArgs,
    SearchLocalPlacesArgs,
    SearchEventsArgs,
    SendWhatsAppArgs,
    CreatePaymentIntentArgs,
    CreateConsumerRequestArgs,
    GetRealTimeInfoArgs,
    ImportListingArgs,
    ToolArgs,
    ToolResolver
} from '../types/tools';
