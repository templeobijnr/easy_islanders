import { getErrorMessage } from '../../utils/errors';
/**
 * URL Extraction Service
 * 
 * Professional approach to extracting content from business websites:
 * 1. Fetch HTML with proper headers (avoid bot detection)
 * 2. Parse with Cheerio (DOM parsing library)
 * 3. Extract meaningful text (skip nav, footer, scripts)
 * 4. Use Gemini to structure into knowledge
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { log } from '../../utils/log';

const MAX_BYTES = 250_000;
const MAX_REDIRECTS = 5;

function isPrivateOrLocalAddress(ip: string): boolean {
    const ipVersion = net.isIP(ip);
    if (!ipVersion) return true;

    if (ipVersion === 4) {
        const [a, b] = ip.split('.').map(v => parseInt(v, 10));
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 0) return true;
        if (a === 169 && b === 254) return true;
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        return false;
    }

    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fe80:')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
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

    if (net.isIP(hostname)) {
        if (isPrivateOrLocalAddress(hostname)) {
            throw new Error('URL_NOT_ALLOWED: private IPs are not allowed');
        }
        return parsed;
    }

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

/**
 * Fetch and extract text content from a URL.
 */
export async function extractFromUrl(url: string): Promise<{
    success: boolean;
    text: string;
    title: string;
    error?: string;
}> {
    try {
        let currentUrl = url;
        let response: any = null;

        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            const allowed = await assertUrlAllowed(currentUrl);

            // Fetch with proper headers to avoid bot detection.
            // Manual redirects so we can re-validate the target URL each hop.
            response = await fetch(allowed.toString(), {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EasyIslandersBot/1.0; +https://easyislanders.com)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 10_000,
                size: MAX_BYTES
            });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers?.get?.('location');
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

        log.info(`[URLExtract] Extracted ${extractedText.length} chars from ${currentUrl}`);

        return { success: true, text: extractedText, title };

    } catch (error: unknown) {
        log.error('[URLExtract] Failed', error);
        return {
            success: false,
            text: '',
            title: '',
            error: getErrorMessage(error) || 'Failed to fetch URL'
        };
    }
}

/**
 * Use Gemini to structure extracted text into business knowledge.
 */
export async function structureExtractedText(rawText: string, businessName?: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        log.warn('[URLExtract] No Gemini API key, returning raw text');
        return rawText;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

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

    } catch (error) {
        log.error('[URLExtract] Gemini structuring failed', error);
        return rawText;
    }
}

export const urlExtractionService = {
    extractFromUrl,
    structureExtractedText
};
