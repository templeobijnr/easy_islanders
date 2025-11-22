import { Request, Response } from 'express';
import * as cheerio from 'cheerio';

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
