"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVendorReply = void 0;
const firebase_1 = require("../../../config/firebase");
const twilio_service_1 = require("../../twilio.service");
const firestore_1 = require("firebase-admin/firestore");
// Keywords to detect intent
const CONFIRM_KEYWORDS = ['yes', 'ok', 'okay', 'confirm', 'coming', 'on the way', 'on my way', 'kabul', 'tamam', 'accepted', 'accept'];
const REJECT_KEYWORDS = ['no', 'sorry', 'busy', 'ret', 'hayır', 'cannot', 'cant', 'decline'];
const ARRIVED_KEYWORDS = ['arrived', 'here', 'outside', 'geldim', 'buradayım'];
const COMPLETED_KEYWORDS = ['done', 'completed', 'finished', 'delivered', 'bitti', 'tamamlandı'];
/**
 * Main interceptor: Checks if incoming WhatsApp is from a vendor responding to an order
 * Returns true if the message was handled as a vendor reply, false otherwise
 */
const handleVendorReply = async (vendorPhone, messageBody) => {
    const normalizedMsg = messageBody.trim().toLowerCase();
    const cleanPhone = vendorPhone.replace('whatsapp:', '');
    console.log(`🔍 [VendorReply] Checking if ${cleanPhone} is responding to an order...`);
    // 1. CHECK TAXI BOOKINGS (Legacy dispatchTaxi)
    const taxiHandled = await checkTaxiBookings(cleanPhone, normalizedMsg, messageBody);
    if (taxiHandled)
        return true;
    // 2. CHECK TAXI REQUESTS (New requestTaxi system)
    const taxiRequestHandled = await checkTaxiRequests(cleanPhone, normalizedMsg, messageBody);
    if (taxiRequestHandled)
        return true;
    // 3. CHECK GROCERY ORDERS
    const groceryHandled = await checkGroceryOrders(cleanPhone, normalizedMsg, messageBody);
    if (groceryHandled)
        return true;
    // 4. CHECK SERVICE REQUESTS
    const serviceHandled = await checkServiceRequests(cleanPhone, normalizedMsg, messageBody);
    if (serviceHandled)
        return true;
    console.log(`ℹ️ [VendorReply] Message from ${cleanPhone} is not a vendor reply - treating as user message`);
    return false;
};
exports.handleVendorReply = handleVendorReply;
/**
 * Check if this is a taxi driver responding (Legacy dispatchTaxi)
 */
async function checkTaxiBookings(vendorPhone, normalizedMsg, messageBody) {
    const taxiQuery = await firebase_1.db.collection('taxiBookings')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(5)
        .get();
    // Find bookings where the vendor phone matches the taxi listing's agentPhone
    for (const bookingDoc of taxiQuery.docs) {
        const booking = bookingDoc.data();
        // Check if this booking's taxi listing has this phone number
        if (!booking.taxiListingId)
            continue;
        const taxiListing = await firebase_1.db.collection('listings').doc(booking.taxiListingId).get();
        if (!taxiListing.exists)
            continue;
        const taxiData = taxiListing.data();
        const taxiPhone = ((taxiData === null || taxiData === void 0 ? void 0 : taxiData.agentPhone) || '').replace('whatsapp:', '');
        if (taxiPhone !== vendorPhone)
            continue;
        // This is the driver! Handle their response
        console.log(`🚕 [VendorReply] Taxi driver ${vendorPhone} responding to booking ${bookingDoc.id}`);
        if (CONFIRM_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await confirmTaxiBooking(bookingDoc.id, booking, messageBody);
            return true;
        }
        if (REJECT_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await rejectTaxiBooking(bookingDoc.id, booking, messageBody);
            return true;
        }
        if (ARRIVED_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await updateTaxiStatus(bookingDoc.id, booking, 'arrived', messageBody);
            return true;
        }
        if (COMPLETED_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await updateTaxiStatus(bookingDoc.id, booking, 'completed', messageBody);
            return true;
        }
        // Generic update
        await updateTaxiStatus(bookingDoc.id, booking, 'updated', messageBody);
        return true;
    }
    return false;
}
/**
 * Check if this is a taxi driver responding (New requestTaxi system)
 */
async function checkTaxiRequests(vendorPhone, normalizedMsg, messageBody) {
    // The taxi service already handles this via its own webhook at /taxi/webhook
    // We don't need to duplicate the logic here, but we should check if there's an active request
    const taxiRequestQuery = await firebase_1.db.collection('taxiRequests')
        .where('status', 'in', ['pending', 'accepted'])
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    for (const requestDoc of taxiRequestQuery.docs) {
        const request = requestDoc.data();
        // Check if this driver was broadcast to
        if (!request.broadcastSentTo || !Array.isArray(request.broadcastSentTo))
            continue;
        // Get driver info to check phone
        for (const driverId of request.broadcastSentTo) {
            const driverDoc = await firebase_1.db.collection('taxiDrivers').doc(driverId).get();
            if (!driverDoc.exists)
                continue;
            const driver = driverDoc.data();
            const driverPhone = ((driver === null || driver === void 0 ? void 0 : driver.phone) || '').replace('whatsapp:', '');
            if (driverPhone === vendorPhone) {
                console.log(`🚕 [VendorReply] Taxi driver ${vendorPhone} responding to request ${requestDoc.id}`);
                // This is handled by the taxi.service.ts already, but we acknowledge it here
                return true;
            }
        }
    }
    return false;
}
/**
 * Check if this is a market/grocery vendor responding
 */
async function checkGroceryOrders(vendorPhone, normalizedMsg, messageBody) {
    const groceryQuery = await firebase_1.db.collection('groceryOrders')
        .where('status', 'in', ['pending', 'confirmed'])
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    for (const orderDoc of groceryQuery.docs) {
        const order = orderDoc.data();
        const vendorPhoneInOrder = (order.vendorPhone || '').replace('whatsapp:', '');
        if (vendorPhoneInOrder !== vendorPhone)
            continue;
        // This is the vendor! Handle their response
        console.log(`🛒 [VendorReply] Market vendor ${vendorPhone} responding to order ${orderDoc.id}`);
        if (CONFIRM_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await confirmGroceryOrder(orderDoc.id, order, messageBody);
            return true;
        }
        if (REJECT_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await rejectGroceryOrder(orderDoc.id, order, messageBody);
            return true;
        }
        if (COMPLETED_KEYWORDS.some(k => normalizedMsg.includes(k)) || normalizedMsg.includes('delivered')) {
            await updateGroceryStatus(orderDoc.id, order, 'delivered', messageBody);
            return true;
        }
        // Generic update
        await updateGroceryStatus(orderDoc.id, order, 'processing', messageBody);
        return true;
    }
    return false;
}
/**
 * Check if this is a service provider responding
 */
async function checkServiceRequests(vendorPhone, normalizedMsg, messageBody) {
    const serviceQuery = await firebase_1.db.collection('serviceRequests')
        .where('status', 'in', ['pending', 'confirmed'])
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    for (const requestDoc of serviceQuery.docs) {
        const request = requestDoc.data();
        const providerPhone = (request.providerPhone || '').replace('whatsapp:', '');
        if (providerPhone !== vendorPhone)
            continue;
        // This is the provider! Handle their response
        console.log(`🔧 [VendorReply] Service provider ${vendorPhone} responding to request ${requestDoc.id}`);
        if (CONFIRM_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await confirmServiceRequest(requestDoc.id, request, messageBody);
            return true;
        }
        if (REJECT_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await rejectServiceRequest(requestDoc.id, request, messageBody);
            return true;
        }
        if (COMPLETED_KEYWORDS.some(k => normalizedMsg.includes(k))) {
            await updateServiceStatus(requestDoc.id, request, 'completed', messageBody);
            return true;
        }
        // Generic update
        await updateServiceStatus(requestDoc.id, request, 'in_progress', messageBody);
        return true;
    }
    return false;
}
// ============================================
// TAXI BOOKING HANDLERS (Legacy dispatchTaxi)
// ============================================
async function confirmTaxiBooking(bookingId, booking, vendorMsg) {
    console.log(`✅ [VendorReply] Confirming taxi booking ${bookingId}`);
    // A. Update Firestore State
    await firebase_1.db.collection('taxiBookings').doc(bookingId).update({
        status: 'confirmed',
        driverLastMessage: vendorMsg,
        driverConfirmedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    // B. Notify User via WhatsApp
    const userMsg = `🚕 *Taxi Confirmed!*\n\nDriver says: "${vendorMsg}"\n\nPickup: ${booking.pickupLocation}\nDestination: ${booking.destination}\n\nYour driver will arrive soon!`;
    if (booking.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(booking.customerContact, userMsg);
    }
    // C. Update Agent Context (Inject System Message)
    await injectSystemMessage(booking.userId, `TAXI UPDATE: Booking ${bookingId} confirmed. Driver replied: "${vendorMsg}". Status changed to 'confirmed'.`);
}
async function rejectTaxiBooking(bookingId, booking, vendorMsg) {
    console.log(`❌ [VendorReply] Taxi booking ${bookingId} rejected`);
    await firebase_1.db.collection('taxiBookings').doc(bookingId).update({
        status: 'rejected',
        driverLastMessage: vendorMsg,
        driverRejectedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const userMsg = `❌ *Taxi Update*\n\nDriver responded: "${vendorMsg}"\n\nWe'll find you another driver shortly.`;
    if (booking.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(booking.customerContact, userMsg);
    }
    await injectSystemMessage(booking.userId, `TAXI UPDATE: Booking ${bookingId} rejected. Driver replied: "${vendorMsg}". Finding alternative driver...`);
}
async function updateTaxiStatus(bookingId, booking, status, vendorMsg) {
    console.log(`🔄 [VendorReply] Updating taxi booking ${bookingId} to status: ${status}`);
    await firebase_1.db.collection('taxiBookings').doc(bookingId).update({
        status,
        driverLastMessage: vendorMsg,
        lastUpdateAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const statusEmoji = status === 'arrived' ? '📍' : status === 'completed' ? '✅' : '🚕';
    const userMsg = `${statusEmoji} *Taxi Update*\n\nDriver: "${vendorMsg}"`;
    if (booking.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(booking.customerContact, userMsg);
    }
    await injectSystemMessage(booking.userId, `TAXI UPDATE: Booking ${bookingId} status changed to '${status}'. Driver: "${vendorMsg}"`);
}
// ============================================
// GROCERY ORDER HANDLERS
// ============================================
async function confirmGroceryOrder(orderId, order, vendorMsg) {
    console.log(`✅ [VendorReply] Confirming grocery order ${orderId}`);
    await firebase_1.db.collection('groceryOrders').doc(orderId).update({
        status: 'confirmed',
        vendorLastMessage: vendorMsg,
        vendorConfirmedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const userMsg = `🛒 *Order Confirmed!*\n\nMarket says: "${vendorMsg}"\n\nItems: ${order.items}\nDelivery to: ${order.deliveryAddress}`;
    if (order.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(order.customerContact, userMsg);
    }
    await injectSystemMessage(order.userId, `GROCERY UPDATE: Order ${orderId} confirmed by vendor. Message: "${vendorMsg}". Status: confirmed.`);
}
async function rejectGroceryOrder(orderId, order, vendorMsg) {
    console.log(`❌ [VendorReply] Grocery order ${orderId} rejected`);
    await firebase_1.db.collection('groceryOrders').doc(orderId).update({
        status: 'rejected',
        vendorLastMessage: vendorMsg,
        vendorRejectedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const userMsg = `❌ *Order Update*\n\nMarket responded: "${vendorMsg}"\n\nWe'll help you find alternatives.`;
    if (order.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(order.customerContact, userMsg);
    }
    await injectSystemMessage(order.userId, `GROCERY UPDATE: Order ${orderId} rejected. Vendor: "${vendorMsg}".`);
}
async function updateGroceryStatus(orderId, order, status, vendorMsg) {
    console.log(`🔄 [VendorReply] Updating grocery order ${orderId} to status: ${status}`);
    await firebase_1.db.collection('groceryOrders').doc(orderId).update({
        status,
        vendorLastMessage: vendorMsg,
        lastUpdateAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const statusEmoji = status === 'delivered' ? '✅' : status === 'processing' ? '🔄' : '🛒';
    const userMsg = `${statusEmoji} *Order Update*\n\nMarket: "${vendorMsg}"`;
    if (order.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(order.customerContact, userMsg);
    }
    await injectSystemMessage(order.userId, `GROCERY UPDATE: Order ${orderId} status changed to '${status}'. Vendor: "${vendorMsg}"`);
}
// ============================================
// SERVICE REQUEST HANDLERS
// ============================================
async function confirmServiceRequest(requestId, request, vendorMsg) {
    console.log(`✅ [VendorReply] Confirming service request ${requestId}`);
    await firebase_1.db.collection('serviceRequests').doc(requestId).update({
        status: 'confirmed',
        providerLastMessage: vendorMsg,
        providerConfirmedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const userMsg = `🔧 *Service Confirmed!*\n\nProvider says: "${vendorMsg}"\n\nService: ${request.serviceType}\nLocation: ${request.location}`;
    if (request.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(request.customerContact, userMsg);
    }
    await injectSystemMessage(request.userId, `SERVICE UPDATE: Request ${requestId} confirmed by provider. Message: "${vendorMsg}". Status: confirmed.`);
}
async function rejectServiceRequest(requestId, request, vendorMsg) {
    console.log(`❌ [VendorReply] Service request ${requestId} rejected`);
    await firebase_1.db.collection('serviceRequests').doc(requestId).update({
        status: 'rejected',
        providerLastMessage: vendorMsg,
        providerRejectedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const userMsg = `❌ *Service Update*\n\nProvider responded: "${vendorMsg}"\n\nWe'll help you find another provider.`;
    if (request.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(request.customerContact, userMsg);
    }
    await injectSystemMessage(request.userId, `SERVICE UPDATE: Request ${requestId} rejected. Provider: "${vendorMsg}".`);
}
async function updateServiceStatus(requestId, request, status, vendorMsg) {
    console.log(`🔄 [VendorReply] Updating service request ${requestId} to status: ${status}`);
    await firebase_1.db.collection('serviceRequests').doc(requestId).update({
        status,
        providerLastMessage: vendorMsg,
        lastUpdateAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    const statusEmoji = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '🔧';
    const userMsg = `${statusEmoji} *Service Update*\n\nProvider: "${vendorMsg}"`;
    if (request.customerContact) {
        await (0, twilio_service_1.sendWhatsApp)(request.customerContact, userMsg);
    }
    await injectSystemMessage(request.userId, `SERVICE UPDATE: Request ${requestId} status changed to '${status}'. Provider: "${vendorMsg}"`);
}
// ============================================
// HELPER: Inject System Message into Chat
// ============================================
async function injectSystemMessage(userId, content) {
    if (!userId || userId === 'guest')
        return;
    try {
        // Get or create the user's default session
        const sessionId = `sess_${userId}_${Date.now()}`;
        const sessionQuery = await firebase_1.db.collection('chatSessions')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .orderBy('lastMessageAt', 'desc')
            .limit(1)
            .get();
        let actualSessionId = sessionId;
        if (!sessionQuery.empty) {
            actualSessionId = sessionQuery.docs[0].id;
        }
        // Add system message to the session
        await firebase_1.db.collection('chatSessions')
            .doc(actualSessionId)
            .collection('messages')
            .add({
            role: 'system',
            parts: [{ text: content }],
            userId,
            agentId: 'agent_default',
            timestamp: new Date().toISOString(),
            source: 'vendor_reply'
        });
        // Update session timestamp
        await firebase_1.db.collection('chatSessions').doc(actualSessionId).set({
            id: actualSessionId,
            userId,
            agentId: 'agent_default',
            lastMessageAt: new Date().toISOString(),
            status: 'active'
        }, { merge: true });
        console.log(`💬 [VendorReply] Injected system message to session ${actualSessionId}`);
    }
    catch (error) {
        console.error(`❌ [VendorReply] Failed to inject system message:`, error);
    }
}
//# sourceMappingURL=vendorReply.service.js.map