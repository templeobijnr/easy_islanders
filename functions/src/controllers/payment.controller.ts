import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

// POST /api/payments/create-intent
export const createPaymentIntent = async (req: Request, res: Response) => {
    try {
        const { bookingId } = req.body;
        const userId = (req as any).user!.uid; // From Auth Middleware

        const result = await paymentService.createPaymentIntent(bookingId, userId);
        res.json(result);
    } catch (error: any) {
        console.error('Payment Intent Error:', error.message);
        res.status(400).json({ error: error.message });
    }
};
