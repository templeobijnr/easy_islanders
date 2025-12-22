"use strict";
/**
 * Clean up old taxi listings that don't have proper fields
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
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
async function cleanOldTaxis() {
    logger.debug("🧹 Cleaning up old taxi listings...\n");
    const taxis = await firebase_1.db
        .collection("listings")
        .where("domain", "==", "Cars")
        .where("type", "==", "taxi")
        .get();
    logger.debug(`Found ${taxis.size} taxi listings\n`);
    let deleted = 0;
    let kept = 0;
    for (const doc of taxis.docs) {
        const data = doc.data();
        // Check if this is an old/bad taxi listing
        if (!data.agentPhone || !data.vehicleModel || !data.plateNumber) {
            logger.debug(`❌ Deleting: ${doc.id} - ${data.title || "Unknown"} (Missing required fields)`);
            await doc.ref.delete();
            deleted++;
        }
        else {
            logger.debug(`✅ Keeping: ${data.title} - ${data.vehicleColor} ${data.vehicleModel} (${data.plateNumber})`);
            kept++;
        }
    }
    logger.debug(`\n📊 Summary:`);
    logger.debug(`   Kept: ${kept} taxi listings`);
    logger.debug(`   Deleted: ${deleted} old/invalid listings`);
    logger.debug(`\n✅ Cleanup complete!`);
    process.exit(0);
}
if (require.main === module) {
    cleanOldTaxis().catch((err) => {
        console.error("Error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=cleanOldTaxis.js.map