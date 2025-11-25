import { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const fetchFn = (globalThis as any).fetch as typeof fetch;

const normalizePrice = (raw?: string) => {
    if (!raw) return undefined;
    const match = raw.replace(/,/g, '').match(/([\d\.]+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return undefined;
};

export const importListingFromUrl = async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };
    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }
    if (!fetchFn) {
        res.status(500).json({ error: 'Fetch not available in runtime' });
        return;
    }

    try {
        const response = await fetchFn(url, { redirect: 'follow' });
        const html = await response.text();
        const $ = cheerio.load(html);

        const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
        const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const ogImage = $('meta[property="og:image"]').attr('content');
        const priceMeta = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content');
        const currencyMeta = $('meta[property="product:price:currency"]').attr('content') || $('meta[property="og:price:currency"]').attr('content');

        // Heuristic price extraction from visible text if meta missing
        const priceText = priceMeta || $('[class*="price"], [id*="price"]').first().text();
        const price = normalizePrice(priceText);
        const currency = currencyMeta || (priceText?.includes('£') ? 'GBP' : priceText?.includes('$') ? 'USD' : undefined);

        // Grab first 4 images
        const images: string[] = [];
        $('img').each((_, el) => {
            const src = $(el).attr('src');
            if (src && images.length < 4) {
                images.push(src);
            }
        });
        if (ogImage) {
            images.unshift(ogImage);
        }

        // Location heuristic
        const possibleLocation = $('[class*="location"], [id*="location"]').first().text().trim() || '';

        res.json({
            title: ogTitle?.trim(),
            description: ogDesc?.trim(),
            price: price || null,
            currency: currency || 'GBP',
            images: images.filter(Boolean),
            location: possibleLocation || undefined
        });
    } catch (error) {
        console.error('[ImportListing] Failed to import', error);
        res.status(500).json({ error: 'Failed to import listing from URL' });
    }
};

/**
 * Create a new listing (any domain)
 */
export const createListing = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const listingData = req.body;

        // Validate required fields
        if (!listingData.domain || !listingData.title || !listingData.price || !listingData.location) {
            res.status(400).json({ error: 'Missing required fields: domain, title, price, location' });
            return;
        }

        // Create listing document
        const newListing = {
            ...listingData,
            ownerUid: user.uid,
            status: listingData.status || 'active',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        // Add to Firestore
        const docRef = await db.collection('listings').add(newListing);

        console.log(`✅ Created listing ${docRef.id} for user ${user.uid}`);

        res.status(201).json({
            success: true,
            id: docRef.id,
            message: 'Listing created successfully'
        });
    } catch (error) {
        console.error('[CreateListing] Error:', error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

/**
 * Update an existing listing
 */
export const updateListing = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            res.status(400).json({ error: 'Listing ID required' });
            return;
        }

        // Check listing exists and user owns it
        const listingRef = db.collection('listings').doc(id);
        const listing = await listingRef.get();

        if (!listing.exists) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        const listingData = listing.data();
        if (listingData?.ownerUid !== user.uid) {
            res.status(403).json({ error: 'Not authorized to update this listing' });
            return;
        }

        // Update listing
        await listingRef.update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`✅ Updated listing ${id}`);

        res.json({
            success: true,
            message: 'Listing updated successfully'
        });
    } catch (error) {
        console.error('[UpdateListing] Error:', error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
};

/**
 * Delete a listing
 */
export const deleteListing = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'Listing ID required' });
            return;
        }

        // Check listing exists and user owns it
        const listingRef = db.collection('listings').doc(id);
        const listing = await listingRef.get();

        if (!listing.exists) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        const listingData = listing.data();
        if (listingData?.ownerUid !== user.uid) {
            res.status(403).json({ error: 'Not authorized to delete this listing' });
            return;
        }

        // Delete listing
        await listingRef.delete();

        console.log(`✅ Deleted listing ${id}`);

        res.json({
            success: true,
            message: 'Listing deleted successfully'
        });
    } catch (error) {
        console.error('[DeleteListing] Error:', error);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
};

/**
 * Get user's listings
 */
export const getUserListings = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { domain, status, limit = 50 } = req.query;

        let query: FirebaseFirestore.Query = db.collection('listings')
            .where('ownerUid', '==', user.uid);

        if (domain) {
            query = query.where('domain', '==', domain);
        }

        if (status) {
            query = query.where('status', '==', status);
        }

        query = query.orderBy('createdAt', 'desc').limit(parseInt(limit as string));

        const snapshot = await query.get();

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            count: listings.length,
            listings
        });
    } catch (error) {
        console.error('[GetUserListings] Error:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
};

/**
 * Get single listing by ID
 */
export const getListingById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'Listing ID required' });
            return;
        }

        const listingRef = db.collection('listings').doc(id);
        const listing = await listingRef.get();

        if (!listing.exists) {
            res.status(404).json({ error: 'Listing not found' });
            return;
        }

        res.json({
            success: true,
            listing: {
                id: listing.id,
                ...listing.data()
            }
        });
    } catch (error) {
        console.error('[GetListingById] Error:', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
};
