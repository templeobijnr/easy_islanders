"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.miscTools = exports.itineraryTools = exports.businessTools = exports.socialTools = exports.userTools = exports.communicationTools = exports.searchTools = exports.bookingTools = exports.taxiTools = exports.toolResolvers = void 0;
const taxi_tools_1 = require("./taxi.tools");
Object.defineProperty(exports, "taxiTools", { enumerable: true, get: function () { return taxi_tools_1.taxiTools; } });
const booking_tools_1 = require("./booking.tools");
Object.defineProperty(exports, "bookingTools", { enumerable: true, get: function () { return booking_tools_1.bookingTools; } });
const search_tools_1 = require("./search.tools");
Object.defineProperty(exports, "searchTools", { enumerable: true, get: function () { return search_tools_1.searchTools; } });
const communication_tools_1 = require("./communication.tools");
Object.defineProperty(exports, "communicationTools", { enumerable: true, get: function () { return communication_tools_1.communicationTools; } });
const user_tools_1 = require("./user.tools");
Object.defineProperty(exports, "userTools", { enumerable: true, get: function () { return user_tools_1.userTools; } });
const social_tools_1 = require("./social.tools");
Object.defineProperty(exports, "socialTools", { enumerable: true, get: function () { return social_tools_1.socialTools; } });
const business_tools_1 = require("./business.tools");
Object.defineProperty(exports, "businessTools", { enumerable: true, get: function () { return business_tools_1.businessTools; } });
const misc_tools_1 = require("./misc.tools");
Object.defineProperty(exports, "miscTools", { enumerable: true, get: function () { return misc_tools_1.miscTools; } });
const itinerary_tools_1 = require("./itinerary.tools");
Object.defineProperty(exports, "itineraryTools", { enumerable: true, get: function () { return itinerary_tools_1.itineraryTools; } });
/**
 * Unified tool resolvers export
 * Combines all modular services into a single object for backward compatibility
 */
exports.toolResolvers = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, taxi_tools_1.taxiTools), booking_tools_1.bookingTools), search_tools_1.searchTools), communication_tools_1.communicationTools), user_tools_1.userTools), social_tools_1.socialTools), business_tools_1.businessTools), itinerary_tools_1.itineraryTools), misc_tools_1.miscTools);
//# sourceMappingURL=index.js.map