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
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * One-off script to delete ALL documents from the `listings` collection.
 * Use with care – this is destructive.
 *
 * Run from the functions directory:
 *   npx ts-node -r esbuild-register src/scripts/clearListings.ts
 */
async function clearListings() {
    const snapshot = await firebase_1.db.collection("listings").get();
    logger.debug(`Found ${snapshot.size} listings to delete...`);
    const batchSize = 500;
    let batch = firebase_1.db.batch();
    let counter = 0;
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        counter++;
        if (counter % batchSize === 0) {
            batch.commit();
            batch = firebase_1.db.batch();
        }
    });
    if (counter % batchSize !== 0) {
        await batch.commit();
    }
    logger.debug("✅ Listings collection cleared.");
}
clearListings()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error("Failed to clear listings:", err);
    process.exit(1);
});
//# sourceMappingURL=clearListings.js.map