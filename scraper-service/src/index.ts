/**
 * Cloud Run Headless Scraper Service
 *
 * Renders SPA pages and captures JSON API responses.
 * Called by Cloud Functions when Tier 1/2 extraction fails.
 */

import express, { Request, Response } from 'express';
import puppeteer, { Browser, Page, HTTPResponse } from 'puppeteer-core';

const PORT = process.env.PORT || 8080;
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

// Hard limits
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_JSON_RESPONSES = 40;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB per response

// Security: Domain blocklist (prevent SSRF)
const BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
]);

interface ScrapeRequest {
    url: string;
    branchId?: number;
    kind?: string;
    maxJsonResponses?: number;
    timeoutMs?: number;
}

interface CapturedResponse {
    url: string;
    status: number;
    contentType: string;
    body: any;
    truncated: boolean;
}

interface ScrapeResponse {
    success: boolean;
    finalUrl: string;
    htmlTitle: string;
    jsonResponses: CapturedResponse[];
    meta: {
        blocked: boolean;
        captcha: boolean;
        timedOut: boolean;
        errorMessage?: string;
    };
}

function isBlockedHost(hostname: string): boolean {
    const lower = hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(lower)) return true;
    if (lower.endsWith('.local')) return true;

    // Check for private IP ranges
    const ipParts = lower.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every(p => !isNaN(p))) {
        const [a, b] = ipParts;
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
    }

    return false;
}

function validateUrl(rawUrl: string): URL {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Only HTTP(S) URLs are allowed');
    }

    if (isBlockedHost(parsed.hostname)) {
        throw new Error('Blocked host');
    }

    if (parsed.username || parsed.password) {
        throw new Error('Credentials in URL not allowed');
    }

    return parsed;
}

function detectCaptcha(html: string): boolean {
    const lower = html.toLowerCase();
    return (
        lower.includes('captcha') ||
        lower.includes('recaptcha') ||
        lower.includes('hcaptcha') ||
        lower.includes('cf-turnstile') ||
        lower.includes('challenge-running') ||
        lower.includes('verify you are human') ||
        (lower.includes('cloudflare') && lower.includes('checking your browser'))
    );
}

function detectBlocked(status: number): boolean {
    return status === 403 || status === 429 || status === 503;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }

    console.log('[Scraper] Launching browser...');
    browserInstance = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            // Cloud Run specific fixes
            '--disable-crash-reporter',
            '--disable-breakpad',
            '--disable-component-update',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--disable-features=TranslateUI',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--hide-scrollbars',
            '--mute-audio',
            '--disable-infobars',
        ],
        // Disable crashpad completely
        env: {
            ...process.env,
            CHROME_CRASHPAD_PIPE_NAME: '',
            BREAKPAD_DUMP_LOCATION: '/tmp',
        },
    });

    console.log('[Scraper] Browser launched');
    return browserInstance;
}

async function scrape(req: ScrapeRequest): Promise<ScrapeResponse> {
    const { url: rawUrl, maxJsonResponses = MAX_JSON_RESPONSES, timeoutMs = DEFAULT_TIMEOUT_MS } = req;

    // Validate URL
    let parsedUrl: URL;
    try {
        parsedUrl = validateUrl(rawUrl);
    } catch (e: any) {
        return {
            success: false,
            finalUrl: rawUrl,
            htmlTitle: '',
            jsonResponses: [],
            meta: { blocked: false, captcha: false, timedOut: false, errorMessage: e.message },
        };
    }

    const browser = await getBrowser();
    const page = await browser.newPage();
    const capturedResponses: CapturedResponse[] = [];

    try {
        // Set realistic viewport and user agent
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Capture JSON responses
        page.on('response', async (response: HTTPResponse) => {
            if (capturedResponses.length >= maxJsonResponses) return;

            const contentType = response.headers()['content-type'] || '';
            if (!contentType.includes('application/json') && !contentType.includes('graphql')) {
                return;
            }

            const status = response.status();
            const url = response.url();

            try {
                const text = await response.text();
                let body: any;
                let truncated = false;

                if (text.length > MAX_BODY_BYTES) {
                    body = { _truncated: true, preview: text.slice(0, 1000) };
                    truncated = true;
                } else {
                    try {
                        body = JSON.parse(text);
                    } catch {
                        body = { _parseError: true, preview: text.slice(0, 500) };
                    }
                }

                capturedResponses.push({ url, status, contentType, body, truncated });
                console.log(`[Scraper] Captured JSON: ${url.slice(0, 100)} (${status})`);
            } catch {
                // Response body unavailable
            }
        });

        // Navigate with timeout
        console.log(`[Scraper] Navigating to: ${parsedUrl.toString()}`);
        const response = await page.goto(parsedUrl.toString(), {
            waitUntil: 'networkidle2',
            timeout: timeoutMs,
        });

        const status = response?.status() || 0;
        const finalUrl = page.url();

        // Wait a bit more for remaining XHR
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => { });

        // Get page content for analysis
        const html = await page.content();
        const title = await page.title();

        const blocked = detectBlocked(status);
        const captcha = detectCaptcha(html);

        console.log(`[Scraper] Done: ${capturedResponses.length} JSON responses, blocked=${blocked}, captcha=${captcha}`);

        return {
            success: !blocked && !captcha,
            finalUrl,
            htmlTitle: title,
            jsonResponses: capturedResponses,
            meta: { blocked, captcha, timedOut: false },
        };
    } catch (e: any) {
        const timedOut = e.message?.includes('timeout') || e.message?.includes('Timeout');
        console.error(`[Scraper] Error: ${e.message}`);

        return {
            success: false,
            finalUrl: parsedUrl.toString(),
            htmlTitle: '',
            jsonResponses: capturedResponses,
            meta: { blocked: false, captcha: false, timedOut, errorMessage: e.message },
        };
    } finally {
        await page.close().catch(() => { });
    }
}

// Express app
const app = express();
app.use(express.json());

// Health check
app.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'scraper-service' });
});

// Main scrape endpoint
app.post('/scrape', async (req: Request, res: Response) => {
    const body = req.body as ScrapeRequest;

    if (!body.url) {
        res.status(400).json({ error: 'url is required' });
        return;
    }

    try {
        const result = await scrape(body);
        res.json(result);
    } catch (e: any) {
        console.error('[Scraper] Unhandled error:', e);
        res.status(500).json({ error: e.message || 'Internal error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`[Scraper] Listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Scraper] SIGTERM received, shutting down...');
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit(0);
});
