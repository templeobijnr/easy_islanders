"use strict";
/**
 * Tool Authorization Guard (CASC-04A)
 *
 * Role-based access control for tool execution.
 *
 * INVARIANTS:
 * - Tool → required role mapping enforced in dispatcher.
 * - Unknown tools denied (fail closed).
 * - Unauthorized access logged with traceId + userId + tool.
 * - Returns typed error: UNAUTHORIZED_TOOL.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolAuthError = void 0;
exports.checkToolAuthorization = checkToolAuthorization;
exports.registerToolPolicy = registerToolPolicy;
exports.getToolPolicy = getToolPolicy;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Tool authorization error.
 */
class ToolAuthError extends Error {
    constructor(toolName, userRole, requiredRole, traceId) {
        super(`Tool '${toolName}' requires '${requiredRole}' role, user has '${userRole}'`);
        this.toolName = toolName;
        this.userRole = userRole;
        this.requiredRole = requiredRole;
        this.traceId = traceId;
        this.code = 'UNAUTHORIZED_TOOL';
        this.httpStatus = 403;
        this.retryable = false;
        this.name = 'ToolAuthError';
    }
}
exports.ToolAuthError = ToolAuthError;
/**
 * Role hierarchy for comparison.
 */
const ROLE_HIERARCHY = {
    anonymous: 0,
    user: 1,
    merchant: 2,
    admin: 3,
    system: 4,
};
/**
 * Tool authorization policies.
 * Maps tool name → required access policy.
 */
const TOOL_POLICIES = {
    // Public tools (any authenticated user)
    searchListings: { minRole: 'user' },
    getListingDetails: { minRole: 'user' },
    getNearbyPlaces: { minRole: 'user' },
    getWeather: { minRole: 'user' },
    // User tools (authenticated users)
    createJob: { minRole: 'user' },
    getJobStatus: { minRole: 'user' },
    cancelJob: { minRole: 'user' },
    createBooking: { minRole: 'user' },
    // Merchant tools (business owners)
    confirmJob: { minRole: 'merchant', requireMerchant: true },
    rejectJob: { minRole: 'merchant', requireMerchant: true },
    updateBusinessHours: { minRole: 'merchant', requireMerchant: true },
    updateMenu: { minRole: 'merchant', requireMerchant: true },
    // Admin tools (platform admins only)
    deleteUser: { minRole: 'admin', requireAdmin: true },
    deleteListing: { minRole: 'admin', requireAdmin: true },
    forceCompleteJob: { minRole: 'admin', requireAdmin: true },
    setMaintenanceMode: { minRole: 'admin', requireAdmin: true },
    viewAllJobs: { minRole: 'admin', requireAdmin: true },
    // System tools (internal only)
    sendDispatchNotification: { minRole: 'system' },
    processWebhook: { minRole: 'system' },
    runScheduledTask: { minRole: 'system' },
};
/**
 * Checks if a role meets the minimum requirement.
 */
function roleAtLeast(userRole, minRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
/**
 * Checks if a user is authorized to use a tool.
 *
 * @param toolName - The tool being requested.
 * @param ctx - Authorization context.
 * @returns Authorization result.
 */
function checkToolAuthorization(toolName, ctx) {
    const { userId, role, businessId, traceId } = ctx;
    // Unknown tool = denied (fail closed)
    const policy = TOOL_POLICIES[toolName];
    if (!policy) {
        logger.error('ToolAuth: Unknown tool denied', {
            component: 'toolAuth',
            event: 'unknown_tool_denied',
            traceId,
            userId,
            toolName,
            userRole: role,
        });
        return {
            authorized: false,
            error: new ToolAuthError(toolName, role, 'unknown', traceId),
        };
    }
    // Check minimum role
    if (!roleAtLeast(role, policy.minRole)) {
        logger.warn('ToolAuth: Insufficient role', {
            component: 'toolAuth',
            event: 'role_denied',
            traceId,
            userId,
            toolName,
            userRole: role,
            requiredRole: policy.minRole,
        });
        return {
            authorized: false,
            error: new ToolAuthError(toolName, role, policy.minRole, traceId),
        };
    }
    // Check merchant requirement
    if (policy.requireMerchant && !businessId) {
        logger.warn('ToolAuth: Merchant required', {
            component: 'toolAuth',
            event: 'merchant_required',
            traceId,
            userId,
            toolName,
        });
        return {
            authorized: false,
            error: new ToolAuthError(toolName, role, 'merchant', traceId),
        };
    }
    // Check admin requirement
    if (policy.requireAdmin && role !== 'admin' && role !== 'system') {
        logger.warn('ToolAuth: Admin required', {
            component: 'toolAuth',
            event: 'admin_required',
            traceId,
            userId,
            toolName,
        });
        return {
            authorized: false,
            error: new ToolAuthError(toolName, role, 'admin', traceId),
        };
    }
    logger.info('ToolAuth: Authorized', {
        component: 'toolAuth',
        event: 'authorized',
        traceId,
        userId,
        toolName,
        userRole: role,
    });
    return { authorized: true };
}
/**
 * Registers a custom tool policy.
 * Use for dynamically registered tools.
 */
function registerToolPolicy(toolName, policy) {
    TOOL_POLICIES[toolName] = policy;
    logger.info('ToolAuth: Policy registered', {
        component: 'toolAuth',
        event: 'policy_registered',
        toolName,
        minRole: policy.minRole,
    });
}
/**
 * Gets the policy for a tool (for testing/debugging).
 */
function getToolPolicy(toolName) {
    return TOOL_POLICIES[toolName];
}
//# sourceMappingURL=toolAuth.guard.js.map