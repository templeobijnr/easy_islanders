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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoTools = exports.serviceTools = exports.foodTools = exports.requestsTools = exports.miscTools = exports.itineraryTools = exports.businessTools = exports.socialTools = exports.userTools = exports.communicationTools = exports.searchTools = exports.bookingTools = exports.taxiTools = exports.toolResolvers = void 0;
var taxi_tools_1 = require("./taxi.tools");
Object.defineProperty(exports, "taxiTools", { enumerable: true, get: function () { return taxi_tools_1.taxiTools; } });
var booking_tools_1 = require("./booking.tools");
Object.defineProperty(exports, "bookingTools", { enumerable: true, get: function () { return booking_tools_1.bookingTools; } });
var search_tools_1 = require("./search.tools");
Object.defineProperty(exports, "searchTools", { enumerable: true, get: function () { return search_tools_1.searchTools; } });
var communication_tools_1 = require("./communication.tools");
Object.defineProperty(exports, "communicationTools", { enumerable: true, get: function () { return communication_tools_1.communicationTools; } });
var user_tools_1 = require("./user.tools");
Object.defineProperty(exports, "userTools", { enumerable: true, get: function () { return user_tools_1.userTools; } });
var social_tools_1 = require("./social.tools");
Object.defineProperty(exports, "socialTools", { enumerable: true, get: function () { return social_tools_1.socialTools; } });
var business_tools_1 = require("./business.tools");
Object.defineProperty(exports, "businessTools", { enumerable: true, get: function () { return business_tools_1.businessTools; } });
var misc_tools_1 = require("./misc.tools");
Object.defineProperty(exports, "miscTools", { enumerable: true, get: function () { return misc_tools_1.miscTools; } });
var itinerary_tools_1 = require("./itinerary.tools");
Object.defineProperty(exports, "itineraryTools", { enumerable: true, get: function () { return itinerary_tools_1.itineraryTools; } });
var requests_tools_1 = require("./requests.tools");
Object.defineProperty(exports, "requestsTools", { enumerable: true, get: function () { return requests_tools_1.requestsTools; } });
// V1 Consumer Tools
var food_tools_1 = require("./food.tools");
Object.defineProperty(exports, "foodTools", { enumerable: true, get: function () { return food_tools_1.foodTools; } });
var service_tools_1 = require("./service.tools");
Object.defineProperty(exports, "serviceTools", { enumerable: true, get: function () { return service_tools_1.serviceTools; } });
var info_tools_1 = require("./info.tools");
Object.defineProperty(exports, "infoTools", { enumerable: true, get: function () { return info_tools_1.infoTools; } });
/**
 * Unified tool resolvers export
 * Combines all modular services into a single object for backward compatibility
 */
exports.toolResolvers = __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, taxi_tools_1.taxiTools), booking_tools_1.bookingTools), search_tools_1.searchTools), communication_tools_1.communicationTools), user_tools_1.userTools), social_tools_1.socialTools), business_tools_1.businessTools), itinerary_tools_1.itineraryTools), misc_tools_1.miscTools), requests_tools_1.requestsTools), food_tools_1.foodTools), service_tools_1.serviceTools), info_tools_1.infoTools);
