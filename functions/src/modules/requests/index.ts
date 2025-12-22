/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Requests module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    RequestSchema,
    RequestStatusSchema,
    RequestTypeSchema,
    CreateRequestInputSchema,
    UpdateRequestStatusInputSchema,
    AssignRequestInputSchema,
    CancelRequestInputSchema,
    RequestQuerySchema,
    isValidStatusTransition,
} from "./requests.schema";

export type {
    Request,
    RequestStatus,
    RequestType,
    CreateRequestInput,
    UpdateRequestStatusInput,
    AssignRequestInput,
    CancelRequestInput,
    RequestQuery,
} from "./requests.schema";

// Service (internal use)
export { RequestsService } from "./requests.service";

// Controller (internal use)
export { RequestsController } from "./requests.controller";

// Cloud Functions (exported to index.ts)
export {
    createRequest,
    getRequest,
    getMyRequests,
    updateRequestStatus,
    assignRequest,
    cancelRequest,
} from "./requests.functions";
