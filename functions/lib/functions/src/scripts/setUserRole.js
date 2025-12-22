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
const errors_1 = require("../utils/errors");
/**
 * Simple script to set a Firebase Auth custom claim `role`
 * for a given user (e.g. 'admin' or 'business').
 *
 * Usage (from project root):
 *   cd functions
 *   npx ts-node -r esbuild-register src/scripts/setUserRole.ts <UID> <role>
 *
 * Example:
 *   npx ts-node -r esbuild-register src/scripts/setUserRole.ts UID_OF_ADMIN admin
 */
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Admin SDK using default credentials (Functions env or local service account)
if (!admin.apps.length) {
    admin.initializeApp();
}
async function main() {
    const [, , uid, role] = process.argv;
    if (!uid || !role) {
        console.error("Usage: setUserRole <UID> <role>");
        console.error("Example: setUserRole 12345 admin");
        process.exit(1);
    }
    if (!["admin", "business", "user"].includes(role)) {
        console.error("Role must be one of: 'admin', 'business', 'user'");
        process.exit(1);
    }
    try {
        logger.debug(`🔧 Setting role for UID=${uid} to '${role}'...`);
        const user = await admin.auth().getUser(uid);
        const existingClaims = user.customClaims || {};
        const updatedClaims = Object.assign(Object.assign({}, existingClaims), { role });
        await admin.auth().setCustomUserClaims(uid, updatedClaims);
        logger.debug("✅ Custom claims updated:", updatedClaims);
        logger.debug("ℹ️ User must sign out and sign back in for the new role to take effect in ID tokens.");
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Failed to set role:", (0, errors_1.getErrorMessage)(err) || err);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=setUserRole.js.map