"use strict";
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
exports.claimAdminRole = exports.demoteAdmin = exports.promoteToAdmin = exports.syncAdminClaims = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
/**
 * Bootstrap emails - same as in auth.triggers.ts
 * These users can claim admin even if their Firestore doc doesn't have role set
 */
const BOOTSTRAP_ADMIN_EMAILS = [
    'temple@easyislanders.com',
    'admin@easyislanders.com'
];
/**
 * Sync Admin Claims
 *
 * This endpoint allows a user to sync their Auth claims with their Firestore role.
 * For bootstrap emails, it will also SET the role in Firestore if not already set.
 *
 * Use case: Existing users from old system need to migrate to new Firestore-based system.
 *
 * Authorization: User must be authenticated
 */
const syncAdminClaims = async (req, res) => {
    var _a;
    try {
        // 1. Verify the ID token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        // 2. Check if this is a bootstrap email (migration path)
        const isBootstrapEmail = email && (BOOTSTRAP_ADMIN_EMAILS.includes(email) ||
            email.endsWith('@easyislanders.com'));
        // 3. Get or create user's Firestore document
        const userRef = firebase_1.db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        let role = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        // If bootstrap email and no admin role set, set it now
        if (isBootstrapEmail && role !== 'admin') {
            await userRef.set({
                uid: uid,
                email: email,
                role: 'admin',
                bootstrapped: true,
                bootstrappedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            role = 'admin';
            console.log(`[Admin Controller] Bootstrap: Set admin role for ${email}`);
        }
        if (!role && !isBootstrapEmail) {
            res.status(403).json({
                error: 'No role assigned and email is not in bootstrap list',
                email: email
            });
            return;
        }
        // 4. Determine claims based on role
        let customClaims;
        if (role === 'admin') {
            customClaims = {
                admin: true,
                role: 'admin',
                accessLevel: 9
            };
        }
        else if (role === 'business') {
            customClaims = {
                admin: false,
                role: 'business',
                accessLevel: 5
            };
        }
        else {
            customClaims = {
                admin: false,
                role: role || 'user',
                accessLevel: 1
            };
        }
        // 5. Set custom claims
        await admin.auth().setCustomUserClaims(uid, customClaims);
        // 6. Signal client to refresh token
        try {
            const rtdb = admin.database();
            await rtdb.ref(`metadata/${uid}`).set({
                refreshTime: Date.now()
            });
        }
        catch (metaErr) {
            console.warn('Skipping metadata refresh (RTDB not configured)');
        }
        console.log(`[Admin Controller] Synced claims for ${email}: role=${role}`);
        res.json({
            status: 'success',
            message: `Claims synced. Role: ${role}. Please sign out and back in to refresh your token.`,
            role: role,
            claims: customClaims
        });
    }
    catch (error) {
        console.error('[Admin Controller] Error syncing claims:', error);
        res.status(500).json({ error: error.message || 'Failed to sync claims' });
    }
};
exports.syncAdminClaims = syncAdminClaims;
/**
 * Promote User to Admin (Admin-Only)
 *
 * Only existing admins can promote other users to admin.
 * This updates both Firestore and Auth claims.
 */
const promoteToAdmin = async (req, res) => {
    try {
        // 1. Verify the ID token and check if caller is admin
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Check if caller is admin
        if (!decodedToken.admin) {
            res.status(403).json({ error: 'Forbidden: Only admins can promote users' });
            return;
        }
        // 2. Get target user ID from request
        const { targetUid, targetEmail } = req.body;
        let uid = targetUid;
        // If email provided instead of UID, look up the UID
        if (!uid && targetEmail) {
            const userRecord = await admin.auth().getUserByEmail(targetEmail);
            uid = userRecord.uid;
        }
        if (!uid) {
            res.status(400).json({ error: 'Must provide targetUid or targetEmail' });
            return;
        }
        // 3. Update Firestore (source of truth)
        await firebase_1.db.collection('users').doc(uid).set({
            role: 'admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            promotedBy: decodedToken.uid
        }, { merge: true });
        // 4. Set Auth custom claims
        const customClaims = {
            admin: true,
            role: 'admin',
            accessLevel: 9
        };
        await admin.auth().setCustomUserClaims(uid, customClaims);
        // 5. Signal token refresh
        try {
            await admin.database().ref(`metadata/${uid}`).set({
                refreshTime: Date.now()
            });
        }
        catch (metaErr) {
            console.warn('Skipping metadata refresh (RTDB not configured)');
        }
        console.log(`[Admin Controller] ${decodedToken.email} promoted ${uid} to admin`);
        res.json({
            status: 'success',
            message: `User ${uid} promoted to admin`,
            promotedBy: decodedToken.email
        });
    }
    catch (error) {
        console.error('[Admin Controller] Error promoting user:', error);
        res.status(500).json({ error: error.message || 'Failed to promote user' });
    }
};
exports.promoteToAdmin = promoteToAdmin;
/**
 * Demote Admin (Admin-Only)
 *
 * Remove admin privileges from a user.
 */
const demoteAdmin = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (!decodedToken.admin) {
            res.status(403).json({ error: 'Forbidden: Only admins can demote users' });
            return;
        }
        const { targetUid } = req.body;
        if (!targetUid) {
            res.status(400).json({ error: 'Must provide targetUid' });
            return;
        }
        // Prevent self-demotion
        if (targetUid === decodedToken.uid) {
            res.status(400).json({ error: 'Cannot demote yourself' });
            return;
        }
        // Update Firestore
        await firebase_1.db.collection('users').doc(targetUid).set({
            role: 'user',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            demotedBy: decodedToken.uid
        }, { merge: true });
        // Update Auth claims
        await admin.auth().setCustomUserClaims(targetUid, {
            admin: false,
            role: 'user',
            accessLevel: 1
        });
        console.log(`[Admin Controller] ${decodedToken.email} demoted ${targetUid}`);
        res.json({
            status: 'success',
            message: `User ${targetUid} demoted to regular user`
        });
    }
    catch (error) {
        console.error('[Admin Controller] Error demoting user:', error);
        res.status(500).json({ error: error.message || 'Failed to demote user' });
    }
};
exports.demoteAdmin = demoteAdmin;
// Legacy export for backwards compatibility
exports.claimAdminRole = exports.syncAdminClaims;
//# sourceMappingURL=admin.controller.js.map