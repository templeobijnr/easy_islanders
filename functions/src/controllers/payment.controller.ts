import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { getErrorMessage } from '../utils/errors';

// POST /api/payments/create-intent
export const createPaymentIntent = async (req: Request, res: Response) => {
    try {
        const { bookingId } = req.body;
        const userId = (req as any).user!.uid; // From Auth Middleware

        const result = await paymentService.createPaymentIntent(bookingId, userId);
        res.json(result);
    } catch (error: unknown) {
        console.error('Payment Intent Error:', getErrorMessage(error));
        res.status(400).json({ error: getErrorMessage(error) });
    }
};
