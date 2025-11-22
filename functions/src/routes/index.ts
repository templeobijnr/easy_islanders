import { Router } from 'express';
import { handleChatMessage } from '../controllers/chat.controller';
import { searchListings } from '../controllers/search.controller';
import { createPaymentIntent } from '../controllers/payment.controller';
import { importListingFromUrl } from '../controllers/listing.controller';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Chat
router.post('/chat/message', isAuthenticated, handleChatMessage);

// Search
router.post('/search', searchListings);

// Payments
router.post('/payments/create-intent', isAuthenticated, createPaymentIntent);

// Listings
router.post('/listings/import', isAuthenticated, importListingFromUrl);

// Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

export default router;
