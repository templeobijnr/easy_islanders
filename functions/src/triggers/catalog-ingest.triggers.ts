import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { getErrorMessage } from '../utils/errors';

import { db } from '../config/firebase';
import { CatalogIngestJob, CatalogIngestProposal, IngestSource } from '../types/catalog-ingest';
import { IngestKind } from '../types/merve';
import { log } from '../utils/log';
import { createHash } from 'crypto';
import { extractEmbeddedJson, getExtractionErrorMessage } from '../services/scraper/embedded';
import { callHeadlessScraper, getHeadlessErrorMessage } from '../services/scraper/headless';

const MAX_URL_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 750_000;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const MAX_URL_TEXT_CHARS = 200_000;
const MAX_FOLLOW_LINKS = 4;

function sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

function getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(apiKey);
}

async function downloadFromStorage(storagePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [meta] = await file.getMetadata();
    const [buffer] = await file.download();
    const mimeType = (meta as any)?.contentType || 'application/octet-stream';
    return { buffer, mimeType };
}

function normalizeText(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function isPrivateOrLocalAddress(ip: string): boolean {
    const ipVersion = net.isIP(ip);
    if (!ipVersion) return true;

    // IPv4 ranges
    if (ipVersion === 4) {
        const [a, b] = ip.split('.').map(v => parseInt(v, 10));
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 0) return true;
        if (a === 169 && b === 254) return true; // link-local + metadata
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        return false;
    }

    // IPv6 ranges
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    return false;
}

async function assertUrlAllowed(rawUrl: string): Promise<URL> {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'https:') {
        throw new Error('URL_NOT_ALLOWED: only https URLs are allowed');
    }

    if (parsed.username || parsed.password) {
        throw new Error('URL_NOT_ALLOWED: credentials in URL are not allowed');
    }

    if (parsed.port && parsed.port !== '443') {
        throw new Error('URL_NOT_ALLOWED: non-443 ports are not allowed');
    }

    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = new Set([
        'localhost',
        'metadata.google.internal',
        'metadata',
        '169.254.169.254'
    ]);
    if (blockedHosts.has(hostname) || hostname.endsWith('.local')) {
        throw new Error('URL_NOT_ALLOWED: host is not allowed');
    }

    // If hostname is an IP literal, validate directly.
    if (net.isIP(hostname)) {
        if (isPrivateOrLocalAddress(hostname)) {
            throw new Error('URL_NOT_ALLOWED: private IPs are not allowed');
        }
        return parsed;
    }

    // DNS resolution guard against private IPs.
    const resolved = await lookup(hostname, { all: true, verbatim: true });
    if (!resolved.length) {
        throw new Error('URL_NOT_ALLOWED: DNS resolution failed');
    }
    for (const addr of resolved) {
        if (isPrivateOrLocalAddress(addr.address)) {
            throw new Error('URL_NOT_ALLOWED: host resolves to a private IP');
        }
    }

    return parsed;
}

function looksLikePdf(contentType: string, url: URL): boolean {
    const lower = contentType.toLowerCase();
    if (lower.includes('application/pdf')) return true;
    return url.pathname.toLowerCase().endsWith('.pdf');
}

function looksLikeImage(contentType: string, url: URL): boolean {
    const lower = contentType.toLowerCase();
    if (lower.startsWith('image/')) return true;
    const pathname = url.pathname.toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'].some(ext => pathname.endsWith(ext));
}

function normalizeImageMimeType(contentType: string, url: URL): string {
    const lower = contentType.toLowerCase();
    if (lower.startsWith('image/')) return lower.split(';')[0].trim();
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith('.png')) return 'image/png';
    if (pathname.endsWith('.webp')) return 'image/webp';
    if (pathname.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
}

async function fetchUrlWithGuards(rawUrl: string): Promise<{ finalUrl: URL; contentType: string; buffer: Buffer }> {
    let currentUrl = rawUrl;

    for (let i = 0; i <= MAX_URL_REDIRECTS; i++) {
        const allowed = await assertUrlAllowed(currentUrl);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let res: Response;
        try {
            res = await fetch(allowed.toString(), {
                method: 'GET',
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EasyIslandersBot/1.0; +https://easyislanders.com)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,image/*;q=0.8,*/*;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
            });
        } finally {
            clearTimeout(timeout);
        }

        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('location');
            if (!location) {
                throw new Error(`URL_FETCH_FAILED: ${res.status} redirect with no location`);
            }
            currentUrl = new URL(location, allowed).toString();
            continue;
        }

        if (!res.ok) {
            throw new Error(`URL_FETCH_FAILED: ${res.status} ${res.statusText}`);
        }

        const contentType = (res.headers.get('content-type') || '').trim();
        const maxBytes =
            looksLikePdf(contentType, allowed) || looksLikeImage(contentType, allowed)
                ? MAX_ASSET_BYTES
                : MAX_HTML_BYTES;

        const contentLength = res.headers.get('content-length');
        if (contentLength) {
            const bytes = parseInt(contentLength, 10);
            if (Number.isFinite(bytes) && bytes > maxBytes) {
                throw new Error(`URL_TOO_LARGE: ${bytes} bytes (max ${maxBytes})`);
            }
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > maxBytes) {
            throw new Error(`URL_TOO_LARGE: ${buffer.length} bytes (max ${maxBytes})`);
        }

        return { finalUrl: allowed, contentType, buffer };
    }

    throw new Error('URL_FETCH_FAILED: too many redirects');
}

function extractTextFromHtml(html: string): { text: string; links: string[] } {
    const $ = cheerio.load(html);

    // Remove unwanted elements.
    $('script, style, nav, footer, header, aside, noscript, iframe, svg, form').remove();
    $('[class*="nav"], [class*="footer"], [class*="header"], [class*="sidebar"]').remove();
    $('[id*="nav"], [id*="footer"], [id*="header"], [id*="sidebar"]').remove();

    // Extract text from main content areas.
    const selectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '#content',
        '.main',
        '#main',
        'body' // fallback
    ];

    let extractedText = '';
    for (const selector of selectors) {
        const content = $(selector).text();
        if (content && content.length > 80) {
            extractedText = content;
            break;
        }
    }

    const text = normalizeText(extractedText).slice(0, MAX_URL_TEXT_CHARS);

    // Pull candidate links for follow-up fetches (single-hop; used only on the initial URL).
    const candidates = new Map<string, number>();
    const keywords = [
        'menu',
        'menus',
        'food',
        'drink',
        'drinks',
        'wine',
        'cocktail',
        'price',
        'prices',
        'pricelist',
        'price-list',
        'services',
        'treatments',
        'spa',
        'salon',
        'packages',
        'catalog',
        'shop'
    ];

    $('a[href]').each((_, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (!href) return;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        const linkText = ($(el).text() || '').toLowerCase();
        const hrefLower = href.toLowerCase();

        let score = 0;
        for (const kw of keywords) {
            if (hrefLower.includes(kw) || linkText.includes(kw)) score += 2;
        }
        if (hrefLower.endsWith('.pdf')) score += 5;
        if (hrefLower.endsWith('.jpg') || hrefLower.endsWith('.jpeg') || hrefLower.endsWith('.png') || hrefLower.endsWith('.webp')) score += 3;

        if (score <= 0) return;
        candidates.set(href, Math.max(candidates.get(href) || 0, score));
    });

    const links = Array.from(candidates.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([href]) => href)
        .slice(0, MAX_FOLLOW_LINKS);

    return { text, links };
}

async function extractTextFromUrl(rawUrl: string): Promise<string> {
    const visited = new Set<string>();

    const extractOnce = async (url: string, followLinks: boolean): Promise<string> => {
        if (visited.has(url)) return '';
        visited.add(url);

        const { finalUrl, contentType, buffer } = await fetchUrlWithGuards(url);

        if (looksLikePdf(contentType, finalUrl)) {
            return extractTextFromPdf(buffer);
        }

        if (looksLikeImage(contentType, finalUrl)) {
            return extractTextFromImage(buffer, normalizeImageMimeType(contentType, finalUrl));
        }

        const htmlOrText = buffer.toString('utf8');
        const lower = contentType.toLowerCase();
        const isHtml = lower.includes('text/html') || lower.includes('application/xhtml+xml') || lower === '';
        if (!isHtml) {
            return normalizeText(htmlOrText).slice(0, MAX_URL_TEXT_CHARS);
        }

        // Tier 1: Try static HTML extraction first
        const extracted = extractTextFromHtml(htmlOrText);
        let combined = extracted.text;

        // Tier 2: If static extraction yields minimal content, try embedded JSON
        if (combined.length < 200) {
            log.info('[CatalogIngest] Static HTML minimal, trying Tier 2 embedded JSON', {
                url,
                staticLength: combined.length
            });

            const embeddedResult = extractEmbeddedJson(htmlOrText);

            if (embeddedResult.type === 'embedded_json_ok' && embeddedResult.text) {
                log.info('[CatalogIngest] Tier 2 success', {
                    source: embeddedResult.metadata.source,
                    itemCount: embeddedResult.metadata.itemCount
                });
                return embeddedResult.text.slice(0, MAX_URL_TEXT_CHARS);
            }

            // Check for blocking responses (still fail immediately for these)
            if (embeddedResult.type === 'blocked_403' ||
                embeddedResult.type === 'rate_limited_429' ||
                embeddedResult.type === 'captcha_challenge') {
                const errorMsg = getExtractionErrorMessage(embeddedResult.type);
                log.warn('[CatalogIngest] Extraction blocked', {
                    url,
                    type: embeddedResult.type
                });
                throw new Error(`URL_EXTRACT_FAILED: ${errorMsg}`);
            }

            // Tier 3: If SPA shell detected, try headless browser
            if (embeddedResult.type === 'js_shell_detected') {
                log.info('[CatalogIngest] SPA shell detected, trying Tier 3 headless scraper', { url });

                const headlessResult = await callHeadlessScraper({ url, timeoutMs: 45000 });

                if (headlessResult.type === 'headless_json_ok' && headlessResult.text) {
                    log.info('[CatalogIngest] Tier 3 success', {
                        source: 'headless',
                        itemCount: headlessResult.metadata.itemCount
                    });
                    return headlessResult.text.slice(0, MAX_URL_TEXT_CHARS);
                }

                // If headless returned HTML (no embedded JSON), still use it for Gemini
                if (headlessResult.type === 'headless_no_items' && headlessResult.text && headlessResult.text.length > 200) {
                    log.info('[CatalogIngest] Tier 3 returned rendered HTML, passing to Gemini', {
                        source: 'headless_html',
                        textLength: headlessResult.text.length
                    });
                    return headlessResult.text.slice(0, MAX_URL_TEXT_CHARS);
                }

                // Headless failed - provide clear error message
                const errorMsg = getHeadlessErrorMessage(headlessResult.type);
                log.warn('[CatalogIngest] Tier 3 headless failed', {
                    url,
                    type: headlessResult.type
                });
                throw new Error(`URL_EXTRACT_FAILED: ${errorMsg}`);
            }

            // Fall through to link following if no embedded JSON found
        }

        if (followLinks && extracted.links.length > 0) {
            const base = finalUrl;
            const followUps = extracted.links
                .map(href => {
                    try {
                        return new URL(href, base).toString();
                    } catch {
                        return null;
                    }
                })
                .filter((u): u is string => Boolean(u))
                // Keep same origin to avoid crawling external sites.
                .filter(u => {
                    try {
                        const parsed = new URL(u);
                        return parsed.hostname === base.hostname;
                    } catch {
                        return false;
                    }
                })
                .filter(u => u !== base.toString())
                .slice(0, MAX_FOLLOW_LINKS);

            if (followUps.length > 0) {
                log.info('[CatalogIngest] Following candidate links', { url: base.toString(), count: followUps.length });
                const texts = await Promise.allSettled(followUps.map(u => extractOnce(u, false)));
                const extra = texts
                    .map(t => (t.status === 'fulfilled' ? t.value : ''))
                    .filter(Boolean)
                    .join('\n\n');
                if (extra) combined = `${combined}\n\n${extra}`;
            }
        }

        return combined.slice(0, MAX_URL_TEXT_CHARS);
    };

    const result = await extractOnce(rawUrl, true);
    if (!result || result.trim().length < 50) {
        throw new Error('URL_EXTRACT_FAILED: No meaningful content found');
    }
    return result;
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    const result = await model.generateContent([
        {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: 'application/pdf',
            }
        },
        [
            'Extract ALL relevant text from this PDF document.',
            'Preserve prices and item names exactly as written.',
            'Return plain text only.',
        ].join('\n')
    ]);
    return result.response.text();
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    const result = await model.generateContent([
        {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType,
            }
        },
        [
            'Extract ALL text from this image.',
            'If it looks like a menu/price list, capture item names + prices.',
            'Return plain text only.',
        ].join('\n')
    ]);
    return result.response.text();
}

async function extractTextForSource(source: IngestSource): Promise<string> {
    switch (source.type) {
        case 'url':
            return extractTextFromUrl(source.url);
        case 'pdf': {
            const file = await downloadFromStorage(source.storagePath);
            return extractTextFromPdf(file.buffer);
        }
        case 'image': {
            const file = await downloadFromStorage(source.storagePath);
            return extractTextFromImage(file.buffer, file.mimeType);
        }
        default: {
            const neverType: never = source;
            throw new Error(`Unsupported source: ${(neverType as any).type}`);
        }
    }
}

function kindPrompt(kind: IngestKind): string {
    switch (kind) {
        case 'menuItems':
            return 'Extract menu items (food/drinks) with category, price, currency.';
        case 'services':
            return 'Extract services with name, description, price (if present), currency.';
        case 'offerings':
            return 'Extract offerings/packages with name, description, price, currency, category.';
        case 'tickets':
            return 'Extract ticket types with name, description, price, currency.';
        case 'roomTypes':
            return 'Extract room types with name, description, nightly price if present, currency.';
    }
}

async function extractItemsFromText(kind: IngestKind, rawText: string): Promise<CatalogIngestProposal['extractedItems']> {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

    const prompt = [
        `You are extracting structured listing data for kind: ${kind}.`,
        kindPrompt(kind),
        '',
        'Rules:',
        '1) Output ONLY a JSON array (no markdown, no commentary).',
        '2) Each item must have: name (string). Optional: description, price (number), currency (TRY|EUR|GBP|USD), category.',
        '3) If price or currency is missing, use null.',
        '4) Do not invent items that are not in the text.',
        '',
        'JSON schema:',
        '[{"name":"...","description":null,"price":null,"currency":null,"category":null}]',
        '',
        'TEXT:',
        rawText.slice(0, 60_000),
    ].join('\n');

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    let parsed: any;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed
        .filter((it: any) => it && typeof it === 'object' && typeof it.name === 'string' && it.name.trim().length > 0)
        .map((it: any) => {
            const name = it.name.trim();
            const description = typeof it.description === 'string' ? it.description.trim() : null;
            const price = typeof it.price === 'number' && Number.isFinite(it.price) ? it.price : null;
            const currency = typeof it.currency === 'string' ? it.currency.trim() : null;
            const category = typeof it.category === 'string' ? it.category.trim() : null;
            const id = sha256Hex(`${kind}:${name}:${price ?? ''}:${currency ?? ''}:${category ?? ''}`).slice(0, 20);
            return {
                id,
                name,
                description: description || null,
                price,
                currency,
                category: category || null,
                available: true,
            };
        });

    return cleaned;
}

/**
 * Normalize a catalog item to match the ListingDataItem schema.
 * Ensures all required fields exist with proper defaults.
 */
export function normalizeCatalogItem(
    item: any,
    index: number,
    kind: IngestKind,
    sourceImageUrl?: string
): {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    category: string | null;
    available: boolean;
    imageUrl: string | null;
    sortOrder: number;
} {
    const name = typeof item.name === 'string' ? item.name.trim() : 'Unnamed Item';
    const description = typeof item.description === 'string' && item.description.trim()
        ? item.description.trim()
        : null;

    // Price normalization
    let price = 0;
    if (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0) {
        price = item.price;
    } else if (typeof item.price === 'string') {
        // Handle string prices like "15.00" or "₺15"
        const numMatch = item.price.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(numMatch);
        if (Number.isFinite(parsed)) price = parsed;
    }

    // Currency normalization
    let currency = 'TRY'; // Default
    if (typeof item.currency === 'string') {
        const c = item.currency.toUpperCase().trim();
        if (['TRY', 'EUR', 'GBP', 'USD'].includes(c)) {
            currency = c;
        } else if (c.includes('₺') || c.includes('TL') || c.includes('LIRA')) {
            currency = 'TRY';
        } else if (c.includes('€') || c.includes('EURO')) {
            currency = 'EUR';
        } else if (c.includes('£') || c.includes('POUND') || c.includes('STERLING')) {
            currency = 'GBP';
        } else if (c.includes('$') || c.includes('DOLLAR')) {
            currency = 'USD';
        }
    }

    // Category normalization
    const category = typeof item.category === 'string' && item.category.trim()
        ? item.category.trim()
        : null;

    // Image URL - use item's imageUrl if present, or fall back to source image
    const imageUrl = typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')
        ? item.imageUrl
        : sourceImageUrl || null;

    // Generate deterministic ID
    const id = item.id || sha256Hex(`${kind}:${name}:${price}:${currency}:${category ?? ''}`).slice(0, 20);

    return {
        id,
        name,
        description,
        price,
        currency,
        category,
        available: item.available !== false,
        imageUrl,
        sortOrder: index,
    };
}

export const onCatalogIngestJobCreated = onDocumentCreated(
    {
        document: 'markets/{marketId}/catalogIngestJobs/{jobId}',
        database: 'easy-db',
        region: 'europe-west1',
        memory: '1GiB',
        timeoutSeconds: 540, // Max allowed for event-triggered functions
        secrets: ['GEMINI_API_KEY', 'BROWSERLESS_TOKEN']
    },
    async (event) => {
        const marketId = event.params.marketId as string | undefined;
        const jobId = event.params.jobId as string | undefined;
        if (!marketId || !jobId) return;

        const jobRef = db.doc(`markets/${marketId}/catalogIngestJobs/${jobId}`);
        const snap = await jobRef.get();
        if (!snap.exists) return;

        const job = snap.data() as CatalogIngestJob;
        if (job.status !== 'queued') return;

        const now = admin.firestore.FieldValue.serverTimestamp();
        await jobRef.set({ status: 'processing', updatedAt: now }, { merge: true });

        log.info('[CatalogIngest] Starting job', {
            marketId,
            jobId,
            listingId: job.listingId,
            kind: job.kind,
            sourceCount: job.sources?.length || 0
        });

        try {
            const sources = Array.isArray(job.sources) ? job.sources : [];

            log.info('[CatalogIngest] Extracting text from sources', {
                jobId,
                sources: sources.map(s => ({ type: s.type }))
            });

            const texts = await Promise.all(sources.map(s => extractTextForSource(s)));
            const combined = texts.filter(Boolean).join('\n\n').trim();

            log.info('[CatalogIngest] Text extraction complete', {
                jobId,
                textLength: combined.length,
                preview: combined.slice(0, 200) + '...'
            });

            if (combined.length < 50) {
                throw new Error('Extracted text too short');
            }

            log.info('[CatalogIngest] Calling Gemini for item extraction', { jobId, kind: job.kind });

            const extractedItems = await extractItemsFromText(job.kind, combined);

            log.info('[CatalogIngest] Item extraction complete', {
                jobId,
                itemCount: extractedItems.length,
                items: extractedItems.slice(0, 5).map(i => ({
                    name: i.name,
                    price: i.price,
                    currency: i.currency
                }))
            });

            const warnings: string[] = [];
            if (extractedItems.length === 0) warnings.push('No items extracted.');
            const missingPrices = extractedItems.filter(i => i.price === null).length;
            if (missingPrices > 0) warnings.push(`${missingPrices} item(s) missing price.`);

            const proposalRef = db.collection('listings').doc(job.listingId).collection('ingestProposals').doc();
            const proposal: Omit<CatalogIngestProposal, 'createdAt' | 'updatedAt'> & any = {
                marketId,
                listingId: job.listingId,
                jobId,
                kind: job.kind,
                sources: job.sources,
                status: 'proposed',
                extractedItems,
                warnings,
                diffSummary: { added: extractedItems.length, updated: 0, removed: 0 },
            };

            await proposalRef.set({ ...proposal, createdAt: now, updatedAt: now });
            await jobRef.set({ status: 'needs_review', proposalId: proposalRef.id, updatedAt: now }, { merge: true });

            log.info('[CatalogIngest] ✅ Proposal created successfully', {
                marketId,
                jobId,
                proposalId: proposalRef.id,
                listingId: job.listingId,
                itemCount: extractedItems.length,
                warnings
            });
        } catch (error: unknown) {
            log.error('[CatalogIngest] ❌ Job failed', error, { marketId, jobId, errorMessage: getErrorMessage(error) });
            await jobRef.set({ status: 'failed', error: getErrorMessage(error) || 'Unknown error', updatedAt: now }, { merge: true });
        }
    }
);
