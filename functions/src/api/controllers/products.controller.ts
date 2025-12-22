/**
 * Products Controller (V1 Owner API)
 * 
 * Secure multi-tenant product catalog management.
 * Uses TenantContext from middleware - never accepts businessId from client.
 * 
 * Products stored under: businesses/{businessId}/products/{productId}
 */

import { Request, Response } from 'express';
import { TenantContext } from '../../types/tenant';
import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { log } from '../../utils/log';

const getProductsPath = (businessId: string) =>
    `businesses/${businessId}/products`;

export interface Product {
    id?: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    category: string;
    available: boolean;
    createdAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

/**
 * GET /v1/owner/products
 * List all products for the business.
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;

    try {
        const snapshot = await db.collection(getProductsPath(ctx.businessId))
            .orderBy('createdAt', 'desc')
            .get();

        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            products,
            count: products.length
        });

    } catch (error: unknown) {
        log.error('[ProductsCtrl] listProducts error', error);
        res.status(500).json({ success: false, error: 'Failed to list products' });
    }
}

/**
 * POST /v1/owner/products
 * Create a single product.
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const { name, description, price, currency, category, available } = req.body;

    if (!name || price === undefined || !category) {
        res.status(400).json({
            success: false,
            error: 'Missing required fields',
            required: ['name', 'price', 'category']
        });
        return;
    }

    try {
        const productData: Product = {
            name,
            description: description || '',
            price: parseFloat(price) || 0,
            currency: currency || 'TL',
            category,
            available: available !== false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        const docRef = await db.collection(getProductsPath(ctx.businessId)).add(productData);

        log.info('[ProductsCtrl] Created product', { productId: docRef.id });

        res.status(201).json({
            success: true,
            product: { id: docRef.id, ...productData }
        });

    } catch (error: unknown) {
        log.error('[ProductsCtrl] createProduct error', error);
        res.status(500).json({ success: false, error: 'Failed to create product' });
    }
}

/**
 * POST /v1/owner/products/batch
 * Import multiple products in a single batch.
 */
export async function batchCreateProducts(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
        res.status(400).json({ success: false, error: 'products array required' });
        return;
    }

    if (products.length > 100) {
        res.status(400).json({ success: false, error: 'Maximum 100 products per batch' });
        return;
    }

    try {
        const batch = db.batch();
        const createdProducts: any[] = [];
        const collectionRef = db.collection(getProductsPath(ctx.businessId));

        for (const p of products) {
            if (!p.name || p.price === undefined) {
                continue; // Skip invalid products
            }

            const docRef = collectionRef.doc();
            const productData: Product = {
                name: p.name,
                description: p.description || '',
                price: parseFloat(p.price) || 0,
                currency: p.currency || 'TL',
                category: p.category || 'uncategorized',
                available: p.available !== false,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            };

            batch.set(docRef, productData);
            createdProducts.push({ id: docRef.id, ...productData });
        }

        await batch.commit();

        log.info('[ProductsCtrl] Batch created products', { created: createdProducts.length });

        res.status(201).json({
            success: true,
            created: createdProducts.length,
            products: createdProducts
        });

    } catch (error: unknown) {
        log.error('[ProductsCtrl] batchCreateProducts error', error);
        res.status(500).json({ success: false, error: 'Failed to create products' });
    }
}

/**
 * PUT /v1/owner/products/:productId
 * Update a product.
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const { productId } = req.params;
    const updates = req.body;

    if (!productId) {
        res.status(400).json({ success: false, error: 'productId required' });
        return;
    }

    try {
        const docRef = db.collection(getProductsPath(ctx.businessId)).doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(404).json({ success: false, error: 'Product not found' });
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

        await docRef.update(sanitizedUpdates);

        res.json({
            success: true,
            product: { id: productId, ...doc.data(), ...sanitizedUpdates }
        });

    } catch (error: unknown) {
        log.error('[ProductsCtrl] updateProduct error', error, { productId });
        res.status(500).json({ success: false, error: 'Failed to update product' });
    }
}

/**
 * DELETE /v1/owner/products/:productId
 * Delete a product.
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const { productId } = req.params;

    if (!productId) {
        res.status(400).json({ success: false, error: 'productId required' });
        return;
    }

    try {
        const docRef = db.collection(getProductsPath(ctx.businessId)).doc(productId);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(404).json({ success: false, error: 'Product not found' });
            return;
        }

        await docRef.delete();

        log.info('[ProductsCtrl] Deleted product', { productId });

        res.json({ success: true });

    } catch (error: unknown) {
        log.error('[ProductsCtrl] deleteProduct error', error, { productId });
        res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
}
