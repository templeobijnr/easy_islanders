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
/**
 * Manual Vendor Reply Test - bypasses index requirement
 * Tests vendor reply matching without complex queries
 */
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const twilio_service_1 = require("../services/twilio.service");
async function manualTestVendorReply() {
    var _a;
    logger.debug("🧪 Manual Vendor Reply Test (No Index Required)\n");
    const vendorPhone = "+905488639394";
    const vendorMessage = "OK, 5 minutes";
    logger.debug(`Vendor: ${vendorPhone}`);
    logger.debug(`Message: "${vendorMessage}"\n`);
    // Get ALL taxi bookings (no index needed)
    const allBookings = await firebase_1.db.collection("taxiBookings").get();
    logger.debug(`📋 Found ${allBookings.size} total taxi bookings\n`);
    // Filter pending bookings manually
    const pendingBookings = allBookings.docs.filter((doc) => {
        const data = doc.data();
        return data.status === "pending";
    });
    logger.debug(`⏳ ${pendingBookings.length} pending bookings\n`);
    // Find booking from this vendor
    for (const bookingDoc of pendingBookings) {
        const booking = bookingDoc.data();
        logger.debug(`Checking booking ${bookingDoc.id}...`);
        logger.debug(`  Taxi Listing ID: ${booking.taxiListingId}`);
        logger.debug(`  Created: ${(_a = booking.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()}`);
        if (!booking.taxiListingId) {
            logger.debug(`  ❌ No taxiListingId\n`);
            continue;
        }
        // Get taxi listing
        const taxiListing = await firebase_1.db
            .collection("listings")
            .doc(booking.taxiListingId)
            .get();
        if (!taxiListing.exists) {
            logger.debug(`  ❌ Taxi listing not found\n`);
            continue;
        }
        const taxiData = taxiListing.data();
        const taxiPhone = ((taxiData === null || taxiData === void 0 ? void 0 : taxiData.agentPhone) || "")
            .replace("whatsapp:", "")
            .replace("+", "");
        const cleanVendorPhone = vendorPhone.replace("+", "");
        logger.debug(`  Taxi Phone: ${taxiData === null || taxiData === void 0 ? void 0 : taxiData.agentPhone}`);
        logger.debug(`  Comparing: "${taxiPhone}" === "${cleanVendorPhone}"`);
        if (taxiPhone === cleanVendorPhone) {
            logger.debug(`  ✅ MATCH! This is the driver!\n`);
            // Update booking
            await bookingDoc.ref.update({
                status: "confirmed",
                driverLastMessage: vendorMessage,
                driverConfirmedAt: new Date(),
                updatedAt: new Date(),
            });
            logger.debug(`✅ Booking ${bookingDoc.id} updated to "confirmed"\n`);
            // Send confirmation to customer
            if (booking.customerContact) {
                const confirmMsg = `✅ *Taxi Confirmed!*\n\nYour taxi (${(taxiData === null || taxiData === void 0 ? void 0 : taxiData.title) || "Unknown"}) confirmed!\n\nDriver said: "${vendorMessage}"\n\nWe'll notify you when they arrive.`;
                await (0, twilio_service_1.sendWhatsApp)(booking.customerContact, confirmMsg);
                logger.debug(`📱 Confirmation sent to customer: ${booking.customerContact}\n`);
            }
            logger.debug(`🎉 SUCCESS! Vendor reply processed.\n`);
            process.exit(0);
        }
        else {
            logger.debug(`  ❌ No match\n`);
        }
    }
    logger.debug(`❌ No matching booking found for vendor ${vendorPhone}\n`);
    process.exit(1);
}
if (require.main === module) {
    manualTestVendorReply().catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=manualTestVendorReply.js.map