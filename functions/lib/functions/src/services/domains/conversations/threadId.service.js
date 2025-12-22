"use strict";
/**
 * Thread ID Service
 *
 * Computes deterministic thread IDs so that:
 * - Same actor + channel combination always resolves to same thread
 * - WhatsApp/App/Discover all land in the same thread when intended
 * - No duplicates, no race conditions
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
exports.computeThreadId = computeThreadId;
exports.generateMessageId = generateMessageId;
const crypto = __importStar(require("crypto"));
// ============================================
// THREAD ID COMPUTATION
// ============================================
/**
 * Thread ID prefixes for human readability in Firestore console.
 */
const THREAD_PREFIXES = {
    general: 'gen',
    business_public: 'bpub',
    business_ops: 'bops',
    dispatch: 'disp',
};
/**
 * Compute a deterministic thread ID.
 *
 * Rules:
 * - General thread: hash("general:" + actorId)
 * - Business public (consumer ↔ business): hash("bizpub:" + businessId + ":" + actorId)
 * - Business ops (staff ↔ business): hash("bizops:" + businessId + ":" + actorId)
 * - Dispatch (driver ↔ fleet): hash("dispatch:" + (businessId ?? "global") + ":" + actorId)
 *
 * @returns A stable, collision-resistant thread ID like "gen_a1b2c3d4"
 */
function computeThreadId(params) {
    const { threadType, actorId, businessId } = params;
    // Validate required businessId for certain thread types
    if (threadType === 'business_public' || threadType === 'business_ops') {
        if (!businessId) {
            throw new Error(`businessId is required for threadType '${threadType}'`);
        }
    }
    // Build the canonical key for hashing
    let key;
    switch (threadType) {
        case 'general':
            key = `general:${actorId}`;
            break;
        case 'business_public':
            key = `bizpub:${businessId}:${actorId}`;
            break;
        case 'business_ops':
            key = `bizops:${businessId}:${actorId}`;
            break;
        case 'dispatch':
            key = `dispatch:${businessId !== null && businessId !== void 0 ? businessId : 'global'}:${actorId}`;
            break;
        default:
            throw new Error(`Unknown threadType: ${threadType}`);
    }
    // Create a short, stable hash
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
    const prefix = THREAD_PREFIXES[threadType];
    return `${prefix}_${hash}`;
}
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Generate a unique message ID.
 * This is NOT deterministic - each call produces a new ID.
 */
function generateMessageId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `msg_${timestamp}_${random}`;
}
//# sourceMappingURL=threadId.service.js.map