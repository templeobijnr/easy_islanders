"use strict";
/**
 * Membership Repository
 *
 * Manages /businesses/{businessId}/members/{uid} subcollection
 * and /userBusinesses/{uid} index for multi-business support.
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
exports.membershipRepository = void 0;
exports.addMember = addMember;
exports.isMember = isMember;
exports.getMember = getMember;
exports.getUserBusinesses = getUserBusinesses;
exports.countUserOwnedBusinesses = countUserOwnedBusinesses;
exports.removeMember = removeMember;
const firebase_1 = require("../config/firebase");
const admin = __importStar(require("firebase-admin"));
const log_1 = require("../utils/log");
/**
 * Add a user as a member of a business.
 * Also updates the userBusinesses index.
 */
async function addMember(businessId, uid, role, options) {
    const batch = firebase_1.db.batch();
    // Add member to business
    const memberRef = firebase_1.db.doc(`businesses/${businessId}/members/${uid}`);
    batch.set(memberRef, {
        uid,
        role,
        status: 'active',
        email: (options === null || options === void 0 ? void 0 : options.email) || null,
        invitedBy: (options === null || options === void 0 ? void 0 : options.invitedBy) || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Add to userBusinesses index
    const userBusinessRef = firebase_1.db.doc(`userBusinesses/${uid}/businesses/${businessId}`);
    batch.set(userBusinessRef, {
        businessId,
        role,
        businessName: (options === null || options === void 0 ? void 0 : options.businessName) || null,
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
    log_1.log.info('[Membership] Added member', { businessId, uid, role });
}
/**
 * Check if user is a member of a business.
 */
async function isMember(businessId, uid) {
    var _a;
    const memberDoc = await firebase_1.db.doc(`businesses/${businessId}/members/${uid}`).get();
    return memberDoc.exists && ((_a = memberDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'active';
}
/**
 * Get member details.
 */
async function getMember(businessId, uid) {
    const memberDoc = await firebase_1.db.doc(`businesses/${businessId}/members/${uid}`).get();
    if (!memberDoc.exists)
        return null;
    return Object.assign({ uid }, memberDoc.data());
}
/**
 * Get all businesses a user is a member of.
 */
async function getUserBusinesses(uid) {
    var _a, _b;
    const snapshot = await firebase_1.db.collection(`userBusinesses/${uid}/businesses`).get();
    if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data());
    }
    // Backward-compatibility fallback: older flows only wrote `users/{uid}.businessId`.
    const userDoc = await firebase_1.db.collection('users').doc(uid).get();
    const legacyBusinessId = userDoc.exists ? (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId : undefined;
    if (!legacyBusinessId)
        return [];
    const businessDoc = await firebase_1.db.collection('businesses').doc(legacyBusinessId).get();
    const businessName = businessDoc.exists ? (_b = businessDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName : undefined;
    return [
        {
            businessId: legacyBusinessId,
            role: 'owner',
            businessName,
            joinedAt: admin.firestore.Timestamp.now()
        }
    ];
}
/**
 * Count how many businesses a user owns.
 */
async function countUserOwnedBusinesses(uid) {
    var _a;
    const snapshot = await firebase_1.db.collection(`userBusinesses/${uid}/businesses`)
        .where('role', '==', 'owner')
        .get();
    if (snapshot.size > 0)
        return snapshot.size;
    // Backward-compatibility fallback: older flows only wrote `users/{uid}.businessId`.
    // Treat that as "owns 1 business" for entitlement checks.
    const userDoc = await firebase_1.db.collection('users').doc(uid).get();
    const legacyBusinessId = userDoc.exists ? (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId : undefined;
    return legacyBusinessId ? 1 : 0;
}
/**
 * Remove a member from a business.
 */
async function removeMember(businessId, uid) {
    const batch = firebase_1.db.batch();
    batch.delete(firebase_1.db.doc(`businesses/${businessId}/members/${uid}`));
    batch.delete(firebase_1.db.doc(`userBusinesses/${uid}/businesses/${businessId}`));
    await batch.commit();
    log_1.log.info('[Membership] Removed member', { businessId, uid });
}
exports.membershipRepository = {
    addMember,
    isMember,
    getMember,
    getUserBusinesses,
    countUserOwnedBusinesses,
    removeMember
};
//# sourceMappingURL=membership.repository.js.map