"use strict";
/**
 * Entitlements Service
 *
 * Manages /entitlements/{uid} for business limits and future paywall.
 * Default: maxBusinesses = 1 for all users.
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
exports.entitlementsService = void 0;
exports.getEntitlements = getEntitlements;
exports.canAddBusiness = canAddBusiness;
exports.updateEntitlements = updateEntitlements;
const firebase_1 = require("../../../config/firebase");
const admin = __importStar(require("firebase-admin"));
const log_1 = require("../../../utils/log");
const DEFAULT_ENTITLEMENTS = {
    maxBusinesses: 1,
    plan: 'free'
};
/**
 * Get entitlements for a user.
 * Creates default entitlements if none exist.
 */
async function getEntitlements(uid) {
    const docRef = firebase_1.db.doc(`entitlements/${uid}`);
    const doc = await docRef.get();
    if (!doc.exists) {
        // Create default entitlements
        const entitlements = Object.assign(Object.assign({}, DEFAULT_ENTITLEMENTS), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await docRef.set(entitlements);
        log_1.log.info('[Entitlements] Created default entitlements', { uid });
        return Object.assign(Object.assign({}, DEFAULT_ENTITLEMENTS), { updatedAt: admin.firestore.Timestamp.now() });
    }
    return doc.data();
}
/**
 * Check if user can add another business.
 */
async function canAddBusiness(uid, currentCount) {
    const entitlements = await getEntitlements(uid);
    if (currentCount >= entitlements.maxBusinesses) {
        return {
            allowed: false,
            reason: `LIMIT_REACHED: You can own up to ${entitlements.maxBusinesses} business(es) on the ${entitlements.plan} plan.`
        };
    }
    return { allowed: true };
}
/**
 * Update entitlements (called by Stripe webhook or admin).
 */
async function updateEntitlements(uid, updates) {
    await firebase_1.db.doc(`entitlements/${uid}`).set(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
    log_1.log.info('[Entitlements] Updated', { uid, updates });
}
exports.entitlementsService = {
    getEntitlements,
    canAddBusiness,
    updateEntitlements
};
//# sourceMappingURL=entitlements.service.js.map