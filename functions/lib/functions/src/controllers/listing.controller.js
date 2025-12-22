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
exports.getListingById = exports.getUserListings = exports.deleteListing = exports.updateListing = exports.createListing = exports.importListingFromUrl = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const cheerio = __importStar(require("cheerio"));
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const fetchFn = globalThis.fetch;
const MAX_HTML_BYTES = 1500000; // 1.5MB safety limit
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
function isPrivateOrLocalIp(host) {
    // IPv6 literals (common local)
    if (host === "::1")
        return true;
    // IPv4 dotted decimal
    const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m)
        return false;
    const parts = m.slice(1).map((n) => parseInt(n, 10));
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255))
        return true;
    const [a, b] = parts;
    // 0.0.0.0/8, 127.0.0.0/8
    if (a === 0 || a === 127)
        return true;
    // 10.0.0.0/8
    if (a === 10)
        return true;
    // 169.254.0.0/16 (link-local, includes 169.254.169.254 metadata)
    if (a === 169 && b === 254)
        return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168)
        return true;
    return false;
}
function isBlockedHostname(hostname) {
    const h = hostname.toLowerCase().trim();
    if (!h)
        return true;
    if (h === "localhost")
        return true;
    if (h.endsWith(".local"))
        return true;
    if (h.endsWith(".internal"))
        return true;
    if (h === "metadata.google.internal")
        return true;
    if (h === "169.254.169.254")
        return true;
    if (isPrivateOrLocalIp(h))
        return true;
    return false;
}
function validateExternalUrl(urlStr) {
    let u;
    try {
        u = new URL(urlStr);
    }
    catch (_a) {
        throw new Error("Invalid URL");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("Only http/https URLs are allowed");
    }
    if (isBlockedHostname(u.hostname)) {
        throw new Error("URL host is not allowed");
    }
    return u;
}
async function readTextWithLimit(response, limitBytes) {
    var _a, _b;
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > limitBytes) {
        throw new Error("Response too large");
    }
    if (!response.body) {
        return await response.text();
    }
    const reader = (_b = (_a = response.body).getReader) === null || _b === void 0 ? void 0 : _b.call(_a);
    if (!reader) {
        // Fallback: may allocate; still guarded by content-length when present.
        return await response.text();
    }
    const decoder = new TextDecoder("utf-8");
    let received = 0;
    let out = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        if (value) {
            received += value.byteLength;
            if (received > limitBytes) {
                try {
                    reader.cancel();
                }
                catch (_c) {
                    // ignore
                }
                throw new Error("Response too large");
            }
            out += decoder.decode(value, { stream: true });
        }
    }
    out += decoder.decode();
    return out;
}
async function fetchHtmlWithSafeRedirects(urlStr) {
    let current = validateExternalUrl(urlStr);
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetchFn(current.toString(), {
                method: "GET",
                redirect: "manual",
                signal: controller.signal,
                headers: {
                    "user-agent": "easy-islanders-import/1.0",
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            });
            // Handle redirects manually so we can validate each hop.
            if (res.status >= 300 && res.status < 400) {
                const loc = res.headers.get("location");
                if (!loc)
                    throw new Error("Redirect without location");
                const next = new URL(loc, current);
                current = validateExternalUrl(next.toString());
                continue;
            }
            if (!res.ok) {
                throw new Error(`Upstream fetch failed (${res.status})`);
            }
            const html = await readTextWithLimit(res, MAX_HTML_BYTES);
            return { finalUrl: current.toString(), html };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    throw new Error("Too many redirects");
}
const normalizePrice = (raw) => {
    if (!raw)
        return undefined;
    const match = raw.replace(/,/g, "").match(/([\d\.]+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return undefined;
};
const importListingFromUrl = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        res.status(400).json({ error: "URL is required" });
        return;
    }
    if (!fetchFn) {
        res.status(500).json({ error: "Fetch not available in runtime" });
        return;
    }
    try {
        const { finalUrl, html } = await fetchHtmlWithSafeRedirects(url);
        const $ = cheerio.load(html);
        const ogTitle = $('meta[property="og:title"]').attr("content") || $("title").text();
        const ogDesc = $('meta[property="og:description"]').attr("content") ||
            $('meta[name="description"]').attr("content");
        const ogImage = $('meta[property="og:image"]').attr("content");
        const priceMeta = $('meta[property="product:price:amount"]').attr("content") ||
            $('meta[property="og:price:amount"]').attr("content");
        const currencyMeta = $('meta[property="product:price:currency"]').attr("content") ||
            $('meta[property="og:price:currency"]').attr("content");
        // Heuristic price extraction from visible text if meta missing
        const priceText = priceMeta || $('[class*="price"], [id*="price"]').first().text();
        const price = normalizePrice(priceText);
        const currency = currencyMeta ||
            ((priceText === null || priceText === void 0 ? void 0 : priceText.includes("£"))
                ? "GBP"
                : (priceText === null || priceText === void 0 ? void 0 : priceText.includes("$"))
                    ? "USD"
                    : undefined);
        // Grab first 4 images
        const images = [];
        $("img").each((_, el) => {
            const src = $(el).attr("src");
            if (src && images.length < 4) {
                images.push(src);
            }
        });
        if (ogImage) {
            images.unshift(ogImage);
        }
        // Location heuristic
        const possibleLocation = $('[class*="location"], [id*="location"]').first().text().trim() || "";
        res.json({
            sourceUrl: finalUrl,
            title: ogTitle === null || ogTitle === void 0 ? void 0 : ogTitle.trim(),
            description: ogDesc === null || ogDesc === void 0 ? void 0 : ogDesc.trim(),
            price: price || null,
            currency: currency || "GBP",
            images: images.filter(Boolean),
            location: possibleLocation || undefined,
        });
    }
    catch (error) {
        console.error("[ImportListing] Failed to import", error);
        res.status(500).json({ error: "Failed to import listing from URL" });
    }
};
exports.importListingFromUrl = importListingFromUrl;
/**
 * Create a new listing (any domain)
 */
const createListing = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const listingData = req.body;
        // Validate required fields
        if (!listingData.domain ||
            !listingData.title ||
            !listingData.price ||
            !listingData.location) {
            res
                .status(400)
                .json({
                error: "Missing required fields: domain, title, price, location",
            });
            return;
        }
        // Create listing document
        const newListing = Object.assign(Object.assign({}, listingData), { ownerUid: user.uid, status: listingData.status || "active", createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
        // Add to Firestore
        const docRef = await firebase_1.db.collection("listings").add(newListing);
        logger.debug(`✅ Created listing ${docRef.id} for user ${user.uid}`);
        res.status(201).json({
            success: true,
            id: docRef.id,
            message: "Listing created successfully",
        });
    }
    catch (error) {
        console.error("[CreateListing] Error:", error);
        res.status(500).json({ error: "Failed to create listing" });
    }
};
exports.createListing = createListing;
/**
 * Update an existing listing
 */
const updateListing = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const updates = req.body;
        if (!id) {
            res.status(400).json({ error: "Listing ID required" });
            return;
        }
        // Check listing exists and user owns it
        const listingRef = firebase_1.db.collection("listings").doc(id);
        const listing = await listingRef.get();
        if (!listing.exists) {
            res.status(404).json({ error: "Listing not found" });
            return;
        }
        const listingData = listing.data();
        if ((listingData === null || listingData === void 0 ? void 0 : listingData.ownerUid) !== user.uid) {
            res.status(403).json({ error: "Not authorized to update this listing" });
            return;
        }
        // Update listing
        await listingRef.update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
        logger.debug(`✅ Updated listing ${id}`);
        res.json({
            success: true,
            message: "Listing updated successfully",
        });
    }
    catch (error) {
        console.error("[UpdateListing] Error:", error);
        res.status(500).json({ error: "Failed to update listing" });
    }
};
exports.updateListing = updateListing;
/**
 * Delete a listing
 */
const deleteListing = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: "Listing ID required" });
            return;
        }
        // Check listing exists and user owns it
        const listingRef = firebase_1.db.collection("listings").doc(id);
        const listing = await listingRef.get();
        if (!listing.exists) {
            res.status(404).json({ error: "Listing not found" });
            return;
        }
        const listingData = listing.data();
        if ((listingData === null || listingData === void 0 ? void 0 : listingData.ownerUid) !== user.uid) {
            res.status(403).json({ error: "Not authorized to delete this listing" });
            return;
        }
        // Delete listing
        await listingRef.delete();
        logger.debug(`✅ Deleted listing ${id}`);
        res.json({
            success: true,
            message: "Listing deleted successfully",
        });
    }
    catch (error) {
        console.error("[DeleteListing] Error:", error);
        res.status(500).json({ error: "Failed to delete listing" });
    }
};
exports.deleteListing = deleteListing;
/**
 * Get user's listings
 */
const getUserListings = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { domain, status, limit = 50 } = req.query;
        let query = firebase_1.db
            .collection("listings")
            .where("ownerUid", "==", user.uid);
        if (domain) {
            query = query.where("domain", "==", domain);
        }
        if (status) {
            query = query.where("status", "==", status);
        }
        query = query.orderBy("createdAt", "desc").limit(parseInt(limit));
        const snapshot = await query.get();
        const listings = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.json({
            success: true,
            count: listings.length,
            listings,
        });
    }
    catch (error) {
        console.error("[GetUserListings] Error:", error);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
};
exports.getUserListings = getUserListings;
/**
 * Get single listing by ID
 */
const getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: "Listing ID required" });
            return;
        }
        const listingRef = firebase_1.db.collection("listings").doc(id);
        const listing = await listingRef.get();
        if (!listing.exists) {
            res.status(404).json({ error: "Listing not found" });
            return;
        }
        res.json({
            success: true,
            listing: Object.assign({ id: listing.id }, listing.data()),
        });
    }
    catch (error) {
        console.error("[GetListingById] Error:", error);
        res.status(500).json({ error: "Failed to fetch listing" });
    }
};
exports.getListingById = getListingById;
//# sourceMappingURL=listing.controller.js.map