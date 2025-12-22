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
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const search_controller_1 = require("../controllers/search.controller");
const payment_controller_1 = require("../controllers/payment.controller");
const listing_controller_1 = require("../controllers/listing.controller");
const import_controller_1 = require("../controllers/import.controller");
const twilio_service_1 = require("../services/twilio.service");
const firebase_1 = require("../config/firebase");
const availability_repository_1 = require("../repositories/availability.repository");
const message_repository_1 = require("../repositories/message.repository");
const populate_controller_1 = require("../controllers/populate.controller");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const requireBusinessMatch_1 = require("../middleware/requireBusinessMatch");
const router = (0, express_1.Router)();
// Chat (Platform Agent) - DO NOT MODIFY
router.post('/chat/message', auth_1.isAuthenticated, chat_controller_1.handleChatMessage);
// Business Chat (Business Agents) - NEW
const business_chat_controller_1 = require("../controllers/business-chat.controller");
router.post('/business-chat/message', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, business_chat_controller_1.handleBusinessChatMessage);
// Search
router.post('/search', search_controller_1.searchListings);
// Payments
router.post('/payments/create-intent', auth_1.isAuthenticated, payment_controller_1.createPaymentIntent);
// Listings CRUD
router.post('/listings', auth_1.isAuthenticated, listing_controller_1.createListing);
router.put('/listings/:id', auth_1.isAuthenticated, listing_controller_1.updateListing);
router.delete('/listings/:id', auth_1.isAuthenticated, listing_controller_1.deleteListing);
router.get('/listings', auth_1.isAuthenticated, listing_controller_1.getUserListings);
router.get('/listings/:id', listing_controller_1.getListingById); // Public endpoint
// Listings Import
router.post('/listings/import', auth_1.isAuthenticated, listing_controller_1.importListingFromUrl);
// Property Import (AI-powered)
router.post('/import/property', auth_1.isAuthenticated, import_controller_1.importPropertyFromUrl);
// Availability endpoints
router.get('/listings/:id/availability', async (req, res) => {
    const { id } = req.params;
    const { start, end } = req.query;
    const slots = await availability_repository_1.availabilityRepository.list(id, start, end);
    res.json(slots);
});
router.post('/listings/:id/availability', auth_1.isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { slotId, slot } = req.body;
    const saved = await availability_repository_1.availabilityRepository.upsert(id, slotId, slot);
    res.json(saved);
});
// Listing messages endpoints
router.get('/listings/:id/messages', auth_1.isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { limit } = req.query;
    const messages = await message_repository_1.messageRepository.list(id, limit ? parseInt(limit, 10) : 50);
    res.json(messages);
});
router.post('/listings/:id/messages', async (req, res) => {
    const { id } = req.params;
    const msg = req.body;
    const created = await message_repository_1.messageRepository.create(id, msg);
    res.json(created);
});
// Taxi Dispatch System
const taxiController = __importStar(require("../controllers/taxi.controller"));
router.post('/taxi/request', auth_1.isAuthenticated, taxiController.requestTaxi);
router.post('/taxi/webhook', taxiController.webhookTwilio); // Twilio WhatsApp callback
// WhatsApp outbound for taxi requests (Legacy)
router.post('/whatsapp/taxi-request', async (req, res) => {
    try {
        const { to, customerContact, pickup, destination, notes } = req.body;
        const resp = await (0, twilio_service_1.sendTaxiRequest)(to, { customerContact, pickup, destination, notes });
        // Persist request log
        await firebase_1.db.collection('taxiRequests').add({
            to,
            customerContact,
            pickup,
            destination,
            notes: notes || '',
            sentAt: new Date().toISOString(),
            sid: resp.sid,
            status: resp.status
        });
        res.json({ success: true, sid: resp.sid, status: resp.status });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to send taxi request' });
    }
});
// WhatsApp inbound webhook (Twilio)
router.post('/whatsapp/webhook', async (req, res) => {
    try {
        const { From, Body, To, MessageSid } = req.body;
        const from = (From || '').replace('whatsapp:', '');
        const text = Body || '';
        console.log('📨 [WhatsApp Webhook] Received message:', { from, to: To, text });
        // Persist inbound message
        const messageRef = await firebase_1.db.collection('whatsappMessages').add({
            from: From,
            to: To,
            body: text,
            direction: 'inbound',
            messageSid: MessageSid,
            receivedAt: new Date().toISOString()
        });
        // VENDOR REPLY INTERCEPTOR: Check if this is a vendor responding to an order
        const { handleVendorReply } = await Promise.resolve().then(() => __importStar(require('../services/vendorReply.service')));
        const isVendorReply = await handleVendorReply(From, text);
        if (isVendorReply) {
            // This was a vendor reply - we've handled it, don't process as user chat
            console.log('✅ [WhatsApp Webhook] Message handled as vendor reply');
            res.status(200).send('OK');
            return;
        }
        // If not a vendor reply, continue with normal processing
        console.log('ℹ️ [WhatsApp Webhook] Processing as user message');
        const textLower = text.toLowerCase();
        // Handle taxi booking responses
        if (textLower.includes('taxi') || textLower.includes('driver') || textLower.includes('pickup')) {
            const taxiBookings = await firebase_1.db.collection('taxiBookings')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            for (const bookingDoc of taxiBookings.docs) {
                const booking = bookingDoc.data();
                const isConfirmed = textLower.includes('confirm') || textLower.includes('accept') || textLower.includes('on my way');
                // Update the most recent pending booking
                await bookingDoc.ref.update({
                    status: isConfirmed ? 'confirmed' : 'updated',
                    driverResponse: text,
                    driverPhone: from,
                    respondedAt: new Date().toISOString()
                });
                console.log(`✅ Updated taxi booking ${bookingDoc.id} with driver response`);
                // Trigger agent to notify the user
                if (booking.userId) {
                    const userSessionId = `session_${booking.userId}_agent_default`;
                    const notificationMessage = isConfirmed
                        ? `Great news! Your taxi booking has been confirmed. The driver says: "${text}". They should arrive at ${booking.pickupLocation} soon!`
                        : `Update on your taxi booking: ${text}`;
                    // Add system message to user's chat session
                    await firebase_1.db.collection('chatSessions').doc(userSessionId).collection('messages').add({
                        role: 'model',
                        parts: [{ text: notificationMessage }],
                        userId: booking.userId,
                        agentId: 'agent_default',
                        timestamp: new Date().toISOString(),
                        source: 'system_notification',
                        bookingId: bookingDoc.id
                    });
                    // Update session's last message time
                    await firebase_1.db.collection('chatSessions').doc(userSessionId).set({
                        lastMessageAt: new Date().toISOString()
                    }, { merge: true });
                    // Send WhatsApp to user if they have a phone number
                    if (booking.customerContact) {
                        try {
                            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
                            await sendWhatsApp(booking.customerContact, notificationMessage);
                            console.log(`📱 Sent WhatsApp notification to user ${booking.userId}`);
                        }
                        catch (err) {
                            console.error('⚠️ Failed to send WhatsApp to user:', err);
                        }
                    }
                    console.log(`🔔 Notified user ${booking.userId} about taxi booking update`);
                }
                break; // Only update the first (most recent) one
            }
        }
        // Handle viewing request responses
        if (textLower.includes('viewing') || textLower.includes('property') || textLower.includes('apartment')) {
            const viewingRequests = await firebase_1.db.collection('viewingRequests')
                .where('status', '==', 'pending')
                .where('listingOwnerContact', '==', from)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            for (const viewingDoc of viewingRequests.docs) {
                const viewing = viewingDoc.data();
                const isConfirmed = textLower.includes('confirm') || textLower.includes('accept') || textLower.includes('yes');
                await viewingDoc.ref.update({
                    status: isConfirmed ? 'confirmed' : 'updated',
                    ownerResponse: text,
                    respondedAt: new Date().toISOString()
                });
                console.log(`✅ Updated viewing request ${viewingDoc.id} with owner response`);
                // Trigger agent to notify the user
                if (viewing.userId) {
                    const userSessionId = `session_${viewing.userId}_agent_default`;
                    const notificationMessage = isConfirmed
                        ? `Excellent! Your viewing request for "${viewing.listingTitle}" has been confirmed. The owner says: "${text}". Viewing scheduled for ${viewing.preferredSlot}.`
                        : `Update on your viewing request for "${viewing.listingTitle}": ${text}`;
                    // Add system message to user's chat session
                    await firebase_1.db.collection('chatSessions').doc(userSessionId).collection('messages').add({
                        role: 'model',
                        parts: [{ text: notificationMessage }],
                        userId: viewing.userId,
                        agentId: 'agent_default',
                        timestamp: new Date().toISOString(),
                        source: 'system_notification',
                        viewingRequestId: viewingDoc.id
                    });
                    // Update session's last message time
                    await firebase_1.db.collection('chatSessions').doc(userSessionId).set({
                        lastMessageAt: new Date().toISOString()
                    }, { merge: true });
                    // Send WhatsApp to user if they have a phone number
                    if (viewing.customerContact) {
                        try {
                            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
                            await sendWhatsApp(viewing.customerContact, notificationMessage);
                            console.log(`📱 Sent WhatsApp notification to user ${viewing.userId}`);
                        }
                        catch (err) {
                            console.error('⚠️ Failed to send WhatsApp to user:', err);
                        }
                    }
                    console.log(`🔔 Notified user ${viewing.userId} about viewing request update`);
                }
                break;
            }
        }
        // Attempt to map to user/session (fallback session per phone)
        let userId = null;
        const userSnap = await firebase_1.db.collection('users').where('phoneNumber', '==', from).limit(1).get();
        if (!userSnap.empty) {
            userId = userSnap.docs[0].id;
        }
        const sessionId = userId ? `whatsapp_${userId}` : `whatsapp_${from}`;
        // Write into chat session so it appears in UI
        await firebase_1.db.collection('chatSessions').doc(sessionId).set({
            id: sessionId,
            userId: userId || null,
            agentId: 'agent_whatsapp',
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString()
        }, { merge: true });
        await firebase_1.db.collection('chatSessions').doc(sessionId).collection('messages').add({
            role: 'model',
            parts: [{ text }],
            userId: userId || null,
            agentId: 'agent_whatsapp',
            timestamp: new Date().toISOString(),
            source: 'whatsapp',
            whatsappMessageId: messageRef.id
        });
        // Acknowledge immediately to Twilio
        res.status(200).send('OK');
    }
    catch (err) {
        console.error('❌ [WhatsApp webhook] Error:', err);
        res.status(500).send('ERROR');
    }
});
// Database Population (Admin only)
router.post('/admin/populate', populate_controller_1.populateDatabase);
// Admin Role Management
const admin_controller_1 = require("../controllers/admin.controller");
router.post('/admin/sync-claims', auth_1.isAuthenticated, admin_controller_1.syncAdminClaims);
router.post('/admin/promote', auth_1.isAuthenticated, admin_controller_1.promoteToAdmin);
router.post('/admin/demote', auth_1.isAuthenticated, admin_controller_1.demoteAdmin);
// Social / Connect
router.get('/users/nearby', auth_1.isAuthenticated, user_controller_1.getNearbyUsers);
router.post('/users/wave', auth_1.isAuthenticated, user_controller_1.waveAtUser);
// Places / Venues
const places_controller_1 = require("../controllers/places.controller");
router.get('/places', places_controller_1.getPlaces);
router.get('/places/nearby', places_controller_1.getNearbyPlaces);
router.get('/places/:id', places_controller_1.getPlaceById);
// Knowledge Base / RAG Pipeline
const knowledge_controller_1 = require("../controllers/knowledge.controller");
router.get('/knowledge/:businessId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.listKnowledge);
router.post('/knowledge/ingest', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.ingestKnowledge);
router.post('/knowledge/ingest-image', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.ingestImage);
router.post('/knowledge/extract-url', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.extractFromUrl);
router.post('/knowledge/retrieve', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.retrieveKnowledge);
router.post('/knowledge/extract-products', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.extractProducts);
router.put('/knowledge/chunk/:chunkId/status', auth_1.isAuthenticated, knowledge_controller_1.updateChunkStatus);
router.delete('/knowledge/:businessId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, knowledge_controller_1.clearKnowledge);
// Products / Catalog
const products_controller_1 = require("../controllers/products.controller");
router.get('/products/:businessId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, products_controller_1.listProducts);
router.get('/products/:businessId/:productId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, products_controller_1.getProduct);
router.post('/products/:businessId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, products_controller_1.createProduct);
router.put('/products/:businessId/:productId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, products_controller_1.updateProduct);
router.delete('/products/:businessId/:productId', auth_1.isAuthenticated, requireBusinessMatch_1.requireBusinessMatch, products_controller_1.deleteProduct);
// Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=index.js.map