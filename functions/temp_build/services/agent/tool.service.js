"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.miscTools = exports.communicationTools = exports.searchTools = exports.bookingTools = exports.taxiTools = exports.toolResolvers = void 0;
// Export the unified tool resolvers from the modular structure
var tools_1 = require("../../services/tools");
Object.defineProperty(exports, "toolResolvers", { enumerable: true, get: function () { return tools_1.toolResolvers; } });
// Also export individual modules for granular imports
var tools_2 = require("../../services/tools");
Object.defineProperty(exports, "taxiTools", { enumerable: true, get: function () { return tools_2.taxiTools; } });
Object.defineProperty(exports, "bookingTools", { enumerable: true, get: function () { return tools_2.bookingTools; } });
Object.defineProperty(exports, "searchTools", { enumerable: true, get: function () { return tools_2.searchTools; } });
Object.defineProperty(exports, "communicationTools", { enumerable: true, get: function () { return tools_2.communicationTools; } });
Object.defineProperty(exports, "miscTools", { enumerable: true, get: function () { return tools_2.miscTools; } });
