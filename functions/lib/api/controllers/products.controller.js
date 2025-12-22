"use strict";
/**
 * Products Controller (V1 Owner API)
 *
 * Secure multi-tenant product catalog management.
 * Uses TenantContext from middleware - never accepts businessId from client.
 *
 * Products stored under: businesses/{businessId}/products/{productId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.batchCreateProducts = batchCreateProducts;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const log_1 = require("../../utils/log");
const getProductsPath = (businessId) => `businesses/${businessId}/products`;
/**
 * GET /v1/owner/products
 * List all products for the business.
 */
async function listProducts(req, res) {
    const ctx = req.tenantContext;
    try {
        const snapshot = await firebase_1.db.collection(getProductsPath(ctx.businessId))
            .orderBy('createdAt', 'desc')
            .get();
        const products = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json({
            success: true,
            products,
            count: products.length
        });
    }
    catch (error) {
        log_1.log.error('[ProductsCtrl] listProducts error', error);
        res.status(500).json({ success: false, error: 'Failed to list products' });
    }
}
/**
 * POST /v1/owner/products
 * Create a single product.
 */
async function createProduct(req, res) {
    const ctx = req.tenantContext;
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
        const productData = {
            name,
            description: description || '',
            price: parseFloat(price) || 0,
            currency: currency || 'TL',
            category,
            available: available !== false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        const docRef = await firebase_1.db.collection(getProductsPath(ctx.businessId)).add(productData);
        log_1.log.info('[ProductsCtrl] Created product', { productId: docRef.id });
        res.status(201).json({
            success: true,
            product: Object.assign({ id: docRef.id }, productData)
        });
    }
    catch (error) {
        log_1.log.error('[ProductsCtrl] createProduct error', error);
        res.status(500).json({ success: false, error: 'Failed to create product' });
    }
}
/**
 * POST /v1/owner/products/batch
 * Import multiple products in a single batch.
 */
async function batchCreateProducts(req, res) {
    const ctx = req.tenantContext;
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
        const batch = firebase_1.db.batch();
        const createdProducts = [];
        const collectionRef = firebase_1.db.collection(getProductsPath(ctx.businessId));
        for (const p of products) {
            if (!p.name || p.price === undefined) {
                continue; // Skip invalid products
            }
            const docRef = collectionRef.doc();
            const productData = {
                name: p.name,
                description: p.description || '',
                price: parseFloat(p.price) || 0,
                currency: p.currency || 'TL',
                category: p.category || 'uncategorized',
                available: p.available !== false,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            };
            batch.set(docRef, productData);
            createdProducts.push(Object.assign({ id: docRef.id }, productData));
        }
        await batch.commit();
        log_1.log.info('[ProductsCtrl] Batch created products', { created: createdProducts.length });
        res.status(201).json({
            success: true,
            created: createdProducts.length,
            products: createdProducts
        });
    }
    catch (error) {
        log_1.log.error('[ProductsCtrl] batchCreateProducts error', error);
        res.status(500).json({ success: false, error: 'Failed to create products' });
    }
}
/**
 * PUT /v1/owner/products/:productId
 * Update a product.
 */
async function updateProduct(req, res) {
    const ctx = req.tenantContext;
    const { productId } = req.params;
    const updates = req.body;
    if (!productId) {
        res.status(400).json({ success: false, error: 'productId required' });
        return;
    }
    try {
        const docRef = firebase_1.db.collection(getProductsPath(ctx.businessId)).doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ success: false, error: 'Product not found' });
            return;
        }
        // Only allow updating specific fields
        const allowedFields = ['name', 'description', 'price', 'currency', 'category', 'available'];
        const sanitizedUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field];
            }
        }
        sanitizedUpdates.updatedAt = firestore_1.FieldValue.serverTimestamp();
        await docRef.update(sanitizedUpdates);
        res.json({
            success: true,
            product: Object.assign(Object.assign({ id: productId }, doc.data()), sanitizedUpdates)
        });
    }
    catch (error) {
        log_1.log.error('[ProductsCtrl] updateProduct error', error, { productId });
        res.status(500).json({ success: false, error: 'Failed to update product' });
    }
}
/**
 * DELETE /v1/owner/products/:productId
 * Delete a product.
 */
async function deleteProduct(req, res) {
    const ctx = req.tenantContext;
    const { productId } = req.params;
    if (!productId) {
        res.status(400).json({ success: false, error: 'productId required' });
        return;
    }
    try {
        const docRef = firebase_1.db.collection(getProductsPath(ctx.businessId)).doc(productId);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ success: false, error: 'Product not found' });
            return;
        }
        await docRef.delete();
        log_1.log.info('[ProductsCtrl] Deleted product', { productId });
        res.json({ success: true });
    }
    catch (error) {
        log_1.log.error('[ProductsCtrl] deleteProduct error', error, { productId });
        res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
}
//# sourceMappingURL=products.controller.js.map