/**
 * Tool Resolvers Index
 *
 * Aggregates all modular tool services into a single export.
 * This maintains backward compatibility with the previous monolithic structure
 * while providing better code organization and maintainability.
 *
 * Architecture Benefits:
 * - Faster Cloud Functions cold starts (only load what's needed)
 * - Better code organization and maintainability
 * - Easier testing (can test each module independently)
 * - Clear separation of concerns
 */

import { taxiTools } from './taxi.tools';
import { bookingTools } from './booking.tools';
import { searchTools } from './search.tools';
import { communicationTools } from './communication.tools';
import { userTools } from './user.tools';
import { socialTools } from './social.tools';
import { businessTools } from './business.tools';
import { miscTools } from './misc.tools';
import { itineraryTools } from './itinerary.tools';
import { requestsTools } from './requests.tools';

// V1 Consumer Tools
import { foodTools } from './food.tools';
import { serviceTools } from './service.tools';
import { infoTools } from './info.tools';

/**
 * Unified tool resolvers export
 * Combines all modular services into a single object for backward compatibility
 */
export const toolResolvers = {
    // Taxi & Transportation
    ...taxiTools,

    // Booking & Reservations
    ...bookingTools,

    // Search & Discovery
    ...searchTools,

    // Communication
    ...communicationTools,

    // User & Personalization
    ...userTools,

    // Social & Community
    ...socialTools,

    // Business Management
    ...businessTools,

    // Itineraries
    ...itineraryTools,

    // Miscellaneous (Encyclopedia, Weather, etc.)
    ...miscTools,

    // Requests (Services, Orders)
    ...requestsTools,

    // V1 Consumer Tools
    ...foodTools,
    ...serviceTools,
    ...infoTools,
};

/**
 * Export individual modules for granular imports
 * Use these when you only need specific functionality
 */
export {
    taxiTools,
    bookingTools,
    searchTools,
    communicationTools,
    userTools,
    socialTools,
    businessTools,

    itineraryTools,
    miscTools,
    requestsTools,

    // V1 Consumer Tools
    foodTools,
    serviceTools,
    infoTools,
};
