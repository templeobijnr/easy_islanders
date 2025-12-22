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
exports.getProductsForAgent = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.listProducts = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const COLLECTION = 'business_products';
/**
 * List all products for a business
 * GET /v1/products/:businessId
 */
const listProducts = async (req, res) => {
    try {
        const { businessId } = req.params;
        if (!businessId) {
            res.status(400).json({ error: 'businessId parameter required' });
            return;
        }
        const snapshot = await firebase_1.db.collection(COLLECTION)
            .where('businessId', '==', businessId)
            .get();
        const toMillis = (value) => {
            if (!value)
                return 0;
            if (typeof value.toMillis === 'function')
                return value.toMillis();
            if (value instanceof Date)
                return value.getTime();
            if (typeof value === 'number')
                return value;
            if (typeof value === 'string') {
                const parsed = Date.parse(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };
        const products = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        products.sort((a, b) => {
            const categoryA = String(a.category || '').toLowerCase();
            const categoryB = String(b.category || '').toLowerCase();
            if (categoryA < categoryB)
                return -1;
            if (categoryA > categoryB)
                return 1;
            return toMillis(b.createdAt) - toMillis(a.createdAt);
        });
        res.json({
            success: true,
            products,
            count: products.length
        });
    }
    catch (error) {
        logger.error('[Products] List error:', error);
        res.status(500).json({ error: 'Failed to list products', message: error.message });
    }
};
exports.listProducts = listProducts;
/**
 * Get a single product
 * GET /v1/products/:businessId/:productId
 */
const getProduct = async (req, res) => {
    try {
        const { businessId, productId } = req.params;
        const doc = await firebase_1.db.collection(COLLECTION).doc(productId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const product = doc.data();
        // Verify business ownership
        if (product.businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
            return;
        }
        res.json({
            success: true,
            product: Object.assign({ id: doc.id }, product)
        });
    }
    catch (error) {
        logger.error('[Products] Get error:', error);
        res.status(500).json({ error: 'Failed to get product', message: error.message });
    }
};
exports.getProduct = getProduct;
/**
 * Create a new product
 * POST /v1/products/:businessId
 */
const createProduct = async (req, res) => {
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
        const productData = {
            businessId,
            name,
            description: description || '',
            price: parseFloat(price) || 0,
            currency: currency || 'EUR',
            category,
            available: available !== false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        const docRef = await firebase_1.db.collection(COLLECTION).add(productData);
        logger.info(`[Products] Created product: ${docRef.id} for business: ${businessId}`);
        res.status(201).json({
            success: true,
            product: Object.assign({ id: docRef.id }, productData)
        });
    }
    catch (error) {
        logger.error('[Products] Create error:', error);
        res.status(500).json({ error: 'Failed to create product', message: error.message });
    }
};
exports.createProduct = createProduct;
/**
 * Update a product
 * PUT /v1/products/:businessId/:productId
 */
const updateProduct = async (req, res) => {
    try {
        const { businessId, productId } = req.params;
        const updates = req.body;
        // Get existing product
        const doc = await firebase_1.db.collection(COLLECTION).doc(productId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Verify business ownership
        if (doc.data().businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
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
        await firebase_1.db.collection(COLLECTION).doc(productId).update(sanitizedUpdates);
        logger.info(`[Products] Updated product: ${productId}`);
        res.json({
            success: true,
            product: Object.assign(Object.assign({ id: productId }, doc.data()), sanitizedUpdates)
        });
    }
    catch (error) {
        logger.error('[Products] Update error:', error);
        res.status(500).json({ error: 'Failed to update product', message: error.message });
    }
};
exports.updateProduct = updateProduct;
/**
 * Delete a product
 * DELETE /v1/products/:businessId/:productId
 */
const deleteProduct = async (req, res) => {
    try {
        const { businessId, productId } = req.params;
        // Get existing product
        const doc = await firebase_1.db.collection(COLLECTION).doc(productId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Verify business ownership
        if (doc.data().businessId !== businessId) {
            res.status(403).json({ error: 'Product does not belong to this business' });
            return;
        }
        await firebase_1.db.collection(COLLECTION).doc(productId).delete();
        logger.info(`[Products] Deleted product: ${productId}`);
        res.json({
            success: true,
            message: 'Product deleted'
        });
    }
    catch (error) {
        logger.error('[Products] Delete error:', error);
        res.status(500).json({ error: 'Failed to delete product', message: error.message });
    }
};
exports.deleteProduct = deleteProduct;
/**
 * Query products for agent (used by RAG)
 * Returns simplified product list for agent context
 */
const getProductsForAgent = async (businessId) => {
    try {
        const snapshot = await firebase_1.db.collection(COLLECTION)
            .where('businessId', '==', businessId)
            .where('available', '==', true)
            .get();
        return snapshot.docs.map(doc => {
            const p = doc.data();
            return `${p.name} (${p.category}) - ${p.currency} ${p.price}${p.description ? `: ${p.description}` : ''}`;
        });
    }
    catch (error) {
        logger.error('[Products] Agent query failed:', error);
        return [];
    }
};
exports.getProductsForAgent = getProductsForAgent;
exports.default = {
    listProducts: exports.listProducts,
    getProduct: exports.getProduct,
    createProduct: exports.createProduct,
    updateProduct: exports.updateProduct,
    deleteProduct: exports.deleteProduct,
    getProductsForAgent: exports.getProductsForAgent
};
//# sourceMappingURL=products.controller.js.map