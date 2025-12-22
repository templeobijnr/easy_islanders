"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
const payment_service_1 = require("../services/payment.service");
const errors_1 = require("../utils/errors");
// POST /api/payments/create-intent
const createPaymentIntent = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.uid; // From Auth Middleware
        const result = await payment_service_1.paymentService.createPaymentIntent(bookingId, userId);
        res.json(result);
    }
    catch (error) {
        console.error('Payment Intent Error:', (0, errors_1.getErrorMessage)(error));
        res.status(400).json({ error: (0, errors_1.getErrorMessage)(error) });
    }
};
exports.createPaymentIntent = createPaymentIntent;
//# sourceMappingURL=payment.controller.js.map