import { getErrorMessage } from '../utils/errors';
/**
 * Products Controller
 * CRUD endpoints for business product catalog
 * 
 * Products enable:
 * - Accurate price quoting by agent
 * - Structured booking with product references
 * - Inventory/availability management
 */
import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'business_products';

export interface Product {
    id?: string;
    businessId: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    category: string;
    available: boolean;
    createdAt?: FirebaseFirestore.FieldValue;
    updatedAt?: FirebaseFirestore.FieldValue;
}

/**
 * List all products for a business
 * GET /v1/products/:businessId
 */
export const listProducts = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            res.status(400).json({ error: 'businessId parameter required' });
            return;
        }

        const snapshot = await db.collection(COLLECTION)
            .where('businessId', '==', businessId)
            .get();

        const toMillis = (value: any): number => {
            if (!value) return 0;
            if (typeof value.toMillis === 'function') return value.toMillis();
            if (value instanceof Date) return value.getTime();
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const parsed = Date.parse(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };

        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        products.sort((a: any, b: any) => {
            const categoryA = String(a.category || '').toLowerCase();
            const categoryB = String(b.category || '').toLowerCase();
            if (categoryA < categoryB) return -1;
            if (categoryA > categoryB) return 1;
            return toMillis(b.createdAt) - toMillis(a.createdAt);
        });

        res.json({
            success: true,
            products,
            count: products.length
        });
    } catch (error: unknown) {
        logger.error('[Products] List error:', error);
        res.status(500).json({ error: 'Failed to list products', message: getErrorMessage(error) });
    }
};

/**
 * Get a single product
 * GET /v1/products/:businessId/:productId
 */
export const getProduct = async (req: Request, res: Response) => {
    try {
        const { businessId, productId } = req.params;

        const doc = await db.collection(COLLECTION).doc(productId).get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        const product = doc.data()!;

        // Verify business ownership
        if (product.businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
            return;
        }

        res.json({
            success: true,
            product: { id: doc.id, ...product }
        });
    } catch (error: unknown) {
        logger.error('[Products] Get error:', error);
        res.status(500).json({ error: 'Failed to get product', message: getErrorMessage(error) });
    }
};

/**
 * Create a new product
 * POST /v1/products/:businessId
 */
export const createProduct = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { name, description, price, currency, category, available } = req.body;

        // Validate required fields
        if (!name || price === undefined || !category) {
            res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'price', 'category']
            });
            return;
        }

        const productData: Product = {
            businessId,
            name,
            description: description || '',
            price: parseFloat(price) || 0,
            currency: currency || 'EUR',
            category,
            available: available !== false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection(COLLECTION).add(productData);
        logger.info(`[Products] Created product: ${docRef.id} for business: ${businessId}`);

        res.status(201).json({
            success: true,
            product: { id: docRef.id, ...productData }
        });
    } catch (error: unknown) {
        logger.error('[Products] Create error:', error);
        res.status(500).json({ error: 'Failed to create product', message: getErrorMessage(error) });
    }
};

/**
 * Update a product
 * PUT /v1/products/:businessId/:productId
 */
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { businessId, productId } = req.params;
        const updates = req.body;

        // Get existing product
        const doc = await db.collection(COLLECTION).doc(productId).get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Verify business ownership
        if (doc.data()!.businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
            return;
        }

        // Only allow updating specific fields
        const allowedFields = ['name', 'description', 'price', 'currency', 'category', 'available'];
        const sanitizedUpdates: Record<string, any> = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field];
            }
        }

        sanitizedUpdates.updatedAt = FieldValue.serverTimestamp();

        await db.collection(COLLECTION).doc(productId).update(sanitizedUpdates);
        logger.info(`[Products] Updated product: ${productId}`);

        res.json({
            success: true,
            product: { id: productId, ...doc.data(), ...sanitizedUpdates }
        });
    } catch (error: unknown) {
        logger.error('[Products] Update error:', error);
        res.status(500).json({ error: 'Failed to update product', message: getErrorMessage(error) });
    }
};

/**
 * Delete a product
 * DELETE /v1/products/:businessId/:productId
 */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { businessId, productId } = req.params;

        // Get existing product
        const doc = await db.collection(COLLECTION).doc(productId).get();

        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Verify business ownership
        if (doc.data()!.businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
            return;
        }

        await db.collection(COLLECTION).doc(productId).delete();
        logger.info(`[Products] Deleted product: ${productId}`);

        res.json({
            success: true,
            message: 'Product deleted'
        });
    } catch (error: unknown) {
        logger.error('[Products] Delete error:', error);
        res.status(500).json({ error: 'Failed to delete product', message: getErrorMessage(error) });
    }
};

/**
 * Query products for agent (used by RAG)
 * Returns simplified product list for agent context
 */
export const getProductsForAgent = async (businessId: string): Promise<string[]> => {
    try {
        const snapshot = await db.collection(COLLECTION)
            .where('businessId', '==', businessId)
            .where('available', '==', true)
            .get();

        return snapshot.docs.map(doc => {
            const p = doc.data();
            return `${p.name} (${p.category}) - ${p.currency} ${p.price}${p.description ? `: ${p.description}` : ''}`;
        });
    } catch (error) {
        logger.error('[Products] Agent query failed:', error);
        return [];
    }
};

export default {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductsForAgent
};
