"use strict";
/**
 * Check recent WhatsApp messages
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
async function checkMessages() {
    logger.debug("📨 Checking for recent WhatsApp messages...\n");
    // Get recent inbound messages (no orderBy to avoid index requirement)
    const messages = await firebase_1.db
        .collection("whatsappMessages")
        .where("direction", "==", "inbound")
        .limit(10)
        .get();
    if (messages.empty) {
        logger.debug("❌ No inbound messages found.");
    }
    else {
        logger.debug(`✅ Found ${messages.size} inbound message(s):\n`);
        const sortedDocs = messages.docs.sort((a, b) => {
            const aTime = a.data().receivedAt || "";
            const bTime = b.data().receivedAt || "";
            return bTime.localeCompare(aTime);
        });
        sortedDocs.forEach((doc, idx) => {
            const data = doc.data();
            logger.debug(`Message ${idx + 1}:`);
            logger.debug(`  From: ${data.from}`);
            logger.debug(`  Body: "${data.body}"`);
            logger.debug(`  Received: ${data.receivedAt}`);
            logger.debug(`  Message SID: ${data.messageSid || "N/A"}`);
            logger.debug(`  Doc ID: ${doc.id}\n`);
        });
    }
    // Also check taxi bookings status
    logger.debug("\n🚕 Checking taxi booking statuses...\n");
    const bookings = await firebase_1.db.collection("taxiBookings").limit(10).get();
    if (!bookings.empty) {
        logger.debug(`Found ${bookings.size} taxi booking(s):\n`);
        bookings.docs.forEach((doc, idx) => {
            var _a, _b, _c, _d, _e;
            const data = doc.data();
            logger.debug(`Booking ${idx + 1}:`);
            logger.debug(`  ID: ${doc.id}`);
            logger.debug(`  Status: ${data.status}`);
            logger.debug(`  Taxi: ${((_a = data.taxiInfo) === null || _a === void 0 ? void 0 : _a.name) || "Unknown"}`);
            logger.debug(`  Driver Message: ${data.driverLastMessage || "N/A"}`);
            logger.debug(`  Created: ${((_c = (_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || "Unknown"}`);
            logger.debug(`  Confirmed: ${((_e = (_d = data.driverConfirmedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || "N/A"}\n`);
        });
    }
    process.exit(0);
}
if (require.main === module) {
    checkMessages().catch((err) => {
        console.error("Error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=checkWhatsAppMessages.js.map