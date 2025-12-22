"use strict";
/**
 * URL Extraction Service
 *
 * Professional approach to extracting content from business websites:
 * 1. Fetch HTML with proper headers (avoid bot detection)
 * 2. Parse with Cheerio (DOM parsing library)
 * 3. Extract meaningful text (skip nav, footer, scripts)
 * 4. Use Gemini to structure into knowledge
 */
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
exports.urlExtractionService = void 0;
exports.extractFromUrl = extractFromUrl;
exports.structureExtractedText = structureExtractedText;
const generative_ai_1 = require("@google/generative-ai");
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
const promises_1 = require("node:dns/promises");
const node_net_1 = __importDefault(require("node:net"));
const log_1 = require("../../utils/log");
const MAX_BYTES = 250000;
const MAX_REDIRECTS = 5;
function isPrivateOrLocalAddress(ip) {
    const ipVersion = node_net_1.default.isIP(ip);
    if (!ipVersion)
        return true;
    if (ipVersion === 4) {
        const [a, b] = ip.split('.').map(v => parseInt(v, 10));
        if (a === 10)
            return true;
        if (a === 127)
            return true;
        if (a === 0)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 192 && b === 168)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        return false;
    }
    const lower = ip.toLowerCase();
    if (lower === '::1')
        return true;
    if (lower.startsWith('fe80:'))
        return true;
    if (lower.startsWith('fc') || lower.startsWith('fd'))
        return true;
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
    if (node_net_1.default.isIP(hostname)) {
        if (isPrivateOrLocalAddress(hostname)) {
            throw new Error('URL_NOT_ALLOWED: private IPs are not allowed');
        }
        return parsed;
    }
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
/**
 * Fetch and extract text content from a URL.
 */
async function extractFromUrl(url) {
    var _a, _b;
    try {
        let currentUrl = url;
        let response = null;
        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            const allowed = await assertUrlAllowed(currentUrl);
            // Fetch with proper headers to avoid bot detection.
            // Manual redirects so we can re-validate the target URL each hop.
            response = await (0, node_fetch_1.default)(allowed.toString(), {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EasyIslandersBot/1.0; +https://easyislanders.com)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 10000,
                size: MAX_BYTES
            });
            if (response.status >= 300 && response.status < 400) {
                const location = (_b = (_a = response.headers) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a, 'location');
                if (!location) {
                    return { success: false, text: '', title: '', error: `HTTP ${response.status}: redirect with no location` };
                }
                currentUrl = new URL(location, allowed).toString();
                continue;
            }
            break;
        }
        if (!response) {
            return { success: false, text: '', title: '', error: 'Failed to fetch URL' };
        }
        if (!response.ok) {
            return {
                success: false,
                text: '',
                title: '',
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
        const html = await response.text();
        // Parse with Cheerio
        const $ = cheerio.load(html);
        // Get page title
        const title = $('title').text().trim() || 'Unknown Page';
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, noscript, iframe, svg, form').remove();
        $('[class*="nav"], [class*="footer"], [class*="header"], [class*="sidebar"], [class*="menu"]').remove();
        $('[id*="nav"], [id*="footer"], [id*="header"], [id*="sidebar"], [id*="menu"]').remove();
        // Extract text from main content areas
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
            if (content && content.length > 100) {
                extractedText = content;
                break;
            }
        }
        // Clean up whitespace
        extractedText = extractedText
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        // Limit length
        if (extractedText.length > 10000) {
            extractedText = extractedText.slice(0, 10000) + '...';
        }
        if (!extractedText || extractedText.length < 50) {
            return {
                success: false,
                text: '',
                title,
                error: 'No meaningful content found on this page'
            };
        }
        log_1.log.info(`[URLExtract] Extracted ${extractedText.length} chars from ${currentUrl}`);
        return { success: true, text: extractedText, title };
    }
    catch (error) {
        log_1.log.error('[URLExtract] Failed', error);
        return {
            success: false,
            text: '',
            title: '',
            error: error.message || 'Failed to fetch URL'
        };
    }
}
/**
 * Use Gemini to structure extracted text into business knowledge.
 */
async function structureExtractedText(rawText, businessName) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        log_1.log.warn('[URLExtract] No Gemini API key, returning raw text');
        return rawText;
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const prompt = `You are extracting business information from a website for ${businessName || 'a business'}.

Given the following raw text from their website, extract and structure the useful business information.

Focus on:
- Products or services offered
- Prices (if mentioned)
- Opening hours
- Location/address
- Contact info
- Special features or policies

Ignore:
- Cookie notices
- Privacy policies
- Navigation text
- Social media links
- Generic website text

Return ONLY the structured business information in clear, readable format. If no useful business info found, say "No business information found."

Raw text:
${rawText.slice(0, 5000)}`;
        const result = await model.generateContent(prompt);
        const structured = result.response.text();
        return structured || rawText;
    }
    catch (error) {
        log_1.log.error('[URLExtract] Gemini structuring failed', error);
        return rawText;
    }
}
exports.urlExtractionService = {
    extractFromUrl,
    structureExtractedText
};
//# sourceMappingURL=url-extraction.service.js.map