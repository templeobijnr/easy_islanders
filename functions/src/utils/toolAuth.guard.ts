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

import * as logger from 'firebase-functions/logger';

/**
 * User roles.
 */
export type UserRole = 'anonymous' | 'user' | 'merchant' | 'admin' | 'system';

/**
 * Tool authorization policy.
 */
interface ToolPolicy {
    minRole: UserRole;
    allowedRoles?: UserRole[];
    requireMerchant?: boolean;
    requireAdmin?: boolean;
}

/**
 * Tool authorization error.
 */
export class ToolAuthError extends Error {
    public readonly code = 'UNAUTHORIZED_TOOL';
    public readonly httpStatus = 403;
    public readonly retryable = false;

    constructor(
        public readonly toolName: string,
        public readonly userRole: UserRole,
        public readonly requiredRole: UserRole,
        public readonly traceId: string
    ) {
        super(`Tool '${toolName}' requires '${requiredRole}' role, user has '${userRole}'`);
        this.name = 'ToolAuthError';
    }
}

/**
 * Role hierarchy for comparison.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
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
const TOOL_POLICIES: Record<string, ToolPolicy> = {
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
 * Context for authorization check.
 */
export interface AuthContext {
    userId?: string;
    role: UserRole;
    businessId?: string;
    traceId: string;
}

/**
 * Result of authorization check.
 */
export interface AuthResult {
    authorized: boolean;
    error?: ToolAuthError;
}

/**
 * Checks if a role meets the minimum requirement.
 */
function roleAtLeast(userRole: UserRole, minRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Checks if a user is authorized to use a tool.
 *
 * @param toolName - The tool being requested.
 * @param ctx - Authorization context.
 * @returns Authorization result.
 */
export function checkToolAuthorization(
    toolName: string,
    ctx: AuthContext
): AuthResult {
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
            error: new ToolAuthError(toolName, role, 'unknown' as UserRole, traceId),
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
export function registerToolPolicy(
    toolName: string,
    policy: ToolPolicy
): void {
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
export function getToolPolicy(toolName: string): ToolPolicy | undefined {
    return TOOL_POLICIES[toolName];
}
