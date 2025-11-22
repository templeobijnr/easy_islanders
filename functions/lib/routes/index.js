"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const search_controller_1 = require("../controllers/search.controller");
const payment_controller_1 = require("../controllers/payment.controller");
const listing_controller_1 = require("../controllers/listing.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Chat
router.post('/chat/message', auth_1.isAuthenticated, chat_controller_1.handleChatMessage);
// Search
router.post('/search', search_controller_1.searchListings);
// Payments
router.post('/payments/create-intent', auth_1.isAuthenticated, payment_controller_1.createPaymentIntent);
// Listings
router.post('/listings/import', auth_1.isAuthenticated, listing_controller_1.importListingFromUrl);
// Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=index.js.map