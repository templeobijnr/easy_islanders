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
async function checkEvents() {
    logger.debug("🔍 Checking for Events in Firestore...");
    try {
        const snapshot = await firebase_1.db
            .collection("listings")
            .where("domain", "==", "Events")
            .get();
        if (snapshot.empty) {
            logger.debug("⚠️ No Events found in Firestore.");
            return;
        }
        logger.debug(`✅ Found ${snapshot.size} Events:`);
        snapshot.forEach((doc) => {
            const data = doc.data();
            logger.debug(`\n📄 Event ID: ${doc.id}`);
            logger.debug(`   Title: ${data.title}`);
            logger.debug(`   Location: ${data.location}`);
            logger.debug(`   Date: ${data.date}`);
            logger.debug(`   Venue: ${data.venue}`);
            logger.debug(`   SubCategory: ${data.subCategory}`);
            logger.debug(`   EventType: ${data.eventType}`);
        });
    }
    catch (error) {
        console.error("❌ Error querying Events:", error);
    }
}
if (require.main === module) {
    checkEvents()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
//# sourceMappingURL=checkEvents.js.map