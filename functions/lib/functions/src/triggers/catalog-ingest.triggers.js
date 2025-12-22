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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCatalogIngestJobCreated = void 0;
exports.normalizeCatalogItem = normalizeCatalogItem;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const cheerio = __importStar(require("cheerio"));
const promises_1 = require("node:dns/promises");
const node_net_1 = __importDefault(require("node:net"));
const errors_1 = require("../utils/errors");
const firebase_1 = require("../config/firebase");
const log_1 = require("../utils/log");
const crypto_1 = require("crypto");
const embedded_1 = require("../services/scraper/embedded");
const headless_1 = require("../services/scraper/headless");
const MAX_URL_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 750000;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const MAX_URL_TEXT_CHARS = 200000;
const MAX_FOLLOW_LINKS = 4;
function sha256Hex(input) {
    return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
}
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY not configured');
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
async function downloadFromStorage(storagePath) {
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [meta] = await file.getMetadata();
    const [buffer] = await file.download();
    const mimeType = (meta === null || meta === void 0 ? void 0 : meta.contentType) || 'application/octet-stream';
    return { buffer, mimeType };
}
function normalizeText(text) {
    return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}
function isPrivateOrLocalAddress(ip) {
    const ipVersion = node_net_1.default.isIP(ip);
    if (!ipVersion)
        return true;
    // IPv4 ranges
    if (ipVersion === 4) {
        const [a, b] = ip.split('.').map(v => parseInt(v, 10));
        if (a === 10)
            return true;
        if (a === 127)
            return true;
        if (a === 0)
            return true;
        if (a === 169 && b === 254)
            return true; // link-local + metadata
        if (a === 192 && b === 168)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        return false;
    }
    // IPv6 ranges
    const lower = ip.toLowerCase();
    if (lower === '::1')
        return true;
    if (lower.startsWith('fe80:'))
        return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd'))
        return true; // unique local
    return false;
}
async function assertUrlAllowed(rawUrl) {
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
    if (node_net_1.default.isIP(hostname)) {
        if (isPrivateOrLocalAddress(hostname)) {
            throw new Error('URL_NOT_ALLOWED: private IPs are not allowed');
        }
        return parsed;
    }
    // DNS resolution guard against private IPs.
    const resolved = await (0, promises_1.lookup)(hostname, { all: true, verbatim: true });
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
function looksLikePdf(contentType, url) {
    const lower = contentType.toLowerCase();
    if (lower.includes('application/pdf'))
        return true;
    return url.pathname.toLowerCase().endsWith('.pdf');
}
function looksLikeImage(contentType, url) {
    const lower = contentType.toLowerCase();
    if (lower.startsWith('image/'))
        return true;
    const pathname = url.pathname.toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'].some(ext => pathname.endsWith(ext));
}
function normalizeImageMimeType(contentType, url) {
    const lower = contentType.toLowerCase();
    if (lower.startsWith('image/'))
        return lower.split(';')[0].trim();
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith('.png'))
        return 'image/png';
    if (pathname.endsWith('.webp'))
        return 'image/webp';
    if (pathname.endsWith('.gif'))
        return 'image/gif';
    return 'image/jpeg';
}
async function fetchUrlWithGuards(rawUrl) {
    let currentUrl = rawUrl;
    for (let i = 0; i <= MAX_URL_REDIRECTS; i++) {
        const allowed = await assertUrlAllowed(currentUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let res;
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
        }
        finally {
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
        const maxBytes = looksLikePdf(contentType, allowed) || looksLikeImage(contentType, allowed)
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
function extractTextFromHtml(html) {
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
    const candidates = new Map();
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
        if (!href)
            return;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
            return;
        const linkText = ($(el).text() || '').toLowerCase();
        const hrefLower = href.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
            if (hrefLower.includes(kw) || linkText.includes(kw))
                score += 2;
        }
        if (hrefLower.endsWith('.pdf'))
            score += 5;
        if (hrefLower.endsWith('.jpg') || hrefLower.endsWith('.jpeg') || hrefLower.endsWith('.png') || hrefLower.endsWith('.webp'))
            score += 3;
        if (score <= 0)
            return;
        candidates.set(href, Math.max(candidates.get(href) || 0, score));
    });
    const links = Array.from(candidates.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([href]) => href)
        .slice(0, MAX_FOLLOW_LINKS);
    return { text, links };
}
async function extractTextFromUrl(rawUrl) {
    const visited = new Set();
    const extractOnce = async (url, followLinks) => {
        if (visited.has(url))
            return '';
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
            log_1.log.info('[CatalogIngest] Static HTML minimal, trying Tier 2 embedded JSON', {
                url,
                staticLength: combined.length
            });
            const embeddedResult = (0, embedded_1.extractEmbeddedJson)(htmlOrText);
            if (embeddedResult.type === 'embedded_json_ok' && embeddedResult.text) {
                log_1.log.info('[CatalogIngest] Tier 2 success', {
                    source: embeddedResult.metadata.source,
                    itemCount: embeddedResult.metadata.itemCount
                });
                return embeddedResult.text.slice(0, MAX_URL_TEXT_CHARS);
            }
            // Check for blocking responses (still fail immediately for these)
            if (embeddedResult.type === 'blocked_403' ||
                embeddedResult.type === 'rate_limited_429' ||
                embeddedResult.type === 'captcha_challenge') {
                const errorMsg = (0, embedded_1.getExtractionErrorMessage)(embeddedResult.type);
                log_1.log.warn('[CatalogIngest] Extraction blocked', {
                    url,
                    type: embeddedResult.type
                });
                throw new Error(`URL_EXTRACT_FAILED: ${errorMsg}`);
            }
            // Tier 3: If SPA shell detected, try headless browser
            if (embeddedResult.type === 'js_shell_detected') {
                log_1.log.info('[CatalogIngest] SPA shell detected, trying Tier 3 headless scraper', { url });
                const headlessResult = await (0, headless_1.callHeadlessScraper)({ url, timeoutMs: 45000 });
                if (headlessResult.type === 'headless_json_ok' && headlessResult.text) {
                    log_1.log.info('[CatalogIngest] Tier 3 success', {
                        source: 'headless',
                        itemCount: headlessResult.metadata.itemCount
                    });
                    return headlessResult.text.slice(0, MAX_URL_TEXT_CHARS);
                }
                // If headless returned HTML (no embedded JSON), still use it for Gemini
                if (headlessResult.type === 'headless_no_items' && headlessResult.text && headlessResult.text.length > 200) {
                    log_1.log.info('[CatalogIngest] Tier 3 returned rendered HTML, passing to Gemini', {
                        source: 'headless_html',
                        textLength: headlessResult.text.length
                    });
                    return headlessResult.text.slice(0, MAX_URL_TEXT_CHARS);
                }
                // Headless failed - provide clear error message
                const errorMsg = (0, headless_1.getHeadlessErrorMessage)(headlessResult.type);
                log_1.log.warn('[CatalogIngest] Tier 3 headless failed', {
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
                }
                catch (_a) {
                    return null;
                }
            })
                .filter((u) => Boolean(u))
                // Keep same origin to avoid crawling external sites.
                .filter(u => {
                try {
                    const parsed = new URL(u);
                    return parsed.hostname === base.hostname;
                }
                catch (_a) {
                    return false;
                }
            })
                .filter(u => u !== base.toString())
                .slice(0, MAX_FOLLOW_LINKS);
            if (followUps.length > 0) {
                log_1.log.info('[CatalogIngest] Following candidate links', { url: base.toString(), count: followUps.length });
                const texts = await Promise.allSettled(followUps.map(u => extractOnce(u, false)));
                const extra = texts
                    .map(t => (t.status === 'fulfilled' ? t.value : ''))
                    .filter(Boolean)
                    .join('\n\n');
                if (extra)
                    combined = `${combined}\n\n${extra}`;
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
async function extractTextFromPdf(buffer) {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
async function extractTextFromImage(buffer, mimeType) {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
async function extractTextForSource(source) {
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
            const neverType = source;
            throw new Error(`Unsupported source: ${neverType.type}`);
        }
    }
}
function kindPrompt(kind) {
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
async function extractItemsFromText(kind, rawText) {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
        rawText.slice(0, 60000),
    ].join('\n');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch)
        return [];
    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    }
    catch (_a) {
        return [];
    }
    if (!Array.isArray(parsed))
        return [];
    const cleaned = parsed
        .filter((it) => it && typeof it === 'object' && typeof it.name === 'string' && it.name.trim().length > 0)
        .map((it) => {
        const name = it.name.trim();
        const description = typeof it.description === 'string' ? it.description.trim() : null;
        const price = typeof it.price === 'number' && Number.isFinite(it.price) ? it.price : null;
        const currency = typeof it.currency === 'string' ? it.currency.trim() : null;
        const category = typeof it.category === 'string' ? it.category.trim() : null;
        const id = sha256Hex(`${kind}:${name}:${price !== null && price !== void 0 ? price : ''}:${currency !== null && currency !== void 0 ? currency : ''}:${category !== null && category !== void 0 ? category : ''}`).slice(0, 20);
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
function normalizeCatalogItem(item, index, kind, sourceImageUrl) {
    const name = typeof item.name === 'string' ? item.name.trim() : 'Unnamed Item';
    const description = typeof item.description === 'string' && item.description.trim()
        ? item.description.trim()
        : null;
    // Price normalization
    let price = 0;
    if (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0) {
        price = item.price;
    }
    else if (typeof item.price === 'string') {
        // Handle string prices like "15.00" or "₺15"
        const numMatch = item.price.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(numMatch);
        if (Number.isFinite(parsed))
            price = parsed;
    }
    // Currency normalization
    let currency = 'TRY'; // Default
    if (typeof item.currency === 'string') {
        const c = item.currency.toUpperCase().trim();
        if (['TRY', 'EUR', 'GBP', 'USD'].includes(c)) {
            currency = c;
        }
        else if (c.includes('₺') || c.includes('TL') || c.includes('LIRA')) {
            currency = 'TRY';
        }
        else if (c.includes('€') || c.includes('EURO')) {
            currency = 'EUR';
        }
        else if (c.includes('£') || c.includes('POUND') || c.includes('STERLING')) {
            currency = 'GBP';
        }
        else if (c.includes('$') || c.includes('DOLLAR')) {
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
    const id = item.id || sha256Hex(`${kind}:${name}:${price}:${currency}:${category !== null && category !== void 0 ? category : ''}`).slice(0, 20);
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
exports.onCatalogIngestJobCreated = (0, firestore_1.onDocumentCreated)({
    document: 'markets/{marketId}/catalogIngestJobs/{jobId}',
    database: 'easy-db',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540, // Max allowed for event-triggered functions
    secrets: ['GEMINI_API_KEY', 'BROWSERLESS_TOKEN']
}, async (event) => {
    var _a;
    const marketId = event.params.marketId;
    const jobId = event.params.jobId;
    if (!marketId || !jobId)
        return;
    const jobRef = firebase_1.db.doc(`markets/${marketId}/catalogIngestJobs/${jobId}`);
    const snap = await jobRef.get();
    if (!snap.exists)
        return;
    const job = snap.data();
    if (job.status !== 'queued')
        return;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await jobRef.set({ status: 'processing', updatedAt: now }, { merge: true });
    log_1.log.info('[CatalogIngest] Starting job', {
        marketId,
        jobId,
        listingId: job.listingId,
        kind: job.kind,
        sourceCount: ((_a = job.sources) === null || _a === void 0 ? void 0 : _a.length) || 0
    });
    try {
        const sources = Array.isArray(job.sources) ? job.sources : [];
        log_1.log.info('[CatalogIngest] Extracting text from sources', {
            jobId,
            sources: sources.map(s => ({ type: s.type }))
        });
        const texts = await Promise.all(sources.map(s => extractTextForSource(s)));
        const combined = texts.filter(Boolean).join('\n\n').trim();
        log_1.log.info('[CatalogIngest] Text extraction complete', {
            jobId,
            textLength: combined.length,
            preview: combined.slice(0, 200) + '...'
        });
        if (combined.length < 50) {
            throw new Error('Extracted text too short');
        }
        log_1.log.info('[CatalogIngest] Calling Gemini for item extraction', { jobId, kind: job.kind });
        const extractedItems = await extractItemsFromText(job.kind, combined);
        log_1.log.info('[CatalogIngest] Item extraction complete', {
            jobId,
            itemCount: extractedItems.length,
            items: extractedItems.slice(0, 5).map(i => ({
                name: i.name,
                price: i.price,
                currency: i.currency
            }))
        });
        const warnings = [];
        if (extractedItems.length === 0)
            warnings.push('No items extracted.');
        const missingPrices = extractedItems.filter(i => i.price === null).length;
        if (missingPrices > 0)
            warnings.push(`${missingPrices} item(s) missing price.`);
        const proposalRef = firebase_1.db.collection('listings').doc(job.listingId).collection('ingestProposals').doc();
        const proposal = {
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
        await proposalRef.set(Object.assign(Object.assign({}, proposal), { createdAt: now, updatedAt: now }));
        await jobRef.set({ status: 'needs_review', proposalId: proposalRef.id, updatedAt: now }, { merge: true });
        log_1.log.info('[CatalogIngest] ✅ Proposal created successfully', {
            marketId,
            jobId,
            proposalId: proposalRef.id,
            listingId: job.listingId,
            itemCount: extractedItems.length,
            warnings
        });
    }
    catch (error) {
        log_1.log.error('[CatalogIngest] ❌ Job failed', error, { marketId, jobId, errorMessage: (0, errors_1.getErrorMessage)(error) });
        await jobRef.set({ status: 'failed', error: (0, errors_1.getErrorMessage)(error) || 'Unknown error', updatedAt: now }, { merge: true });
    }
});
//# sourceMappingURL=catalog-ingest.triggers.js.map