import * as logger from "firebase-functions/logger";
import type { Request, Response as ExpressResponse } from "express";
import * as cheerio from "cheerio";
import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

const fetchFn = (globalThis as any).fetch as typeof fetch;
const MAX_HTML_BYTES = 1_500_000; // 1.5MB safety limit
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function isPrivateOrLocalIp(host: string): boolean {
  // IPv6 literals (common local)
  if (host === "::1") return true;

  // IPv4 dotted decimal
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const parts = m.slice(1).map((n) => parseInt(n, 10));
  if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8, 127.0.0.0/8
  if (a === 0 || a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 169.254.0.0/16 (link-local, includes 169.254.169.254 metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (!h) return true;
  if (h === "localhost") return true;
  if (h.endsWith(".local")) return true;
  if (h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal") return true;
  if (h === "169.254.169.254") return true;
  if (isPrivateOrLocalIp(h)) return true;
  return false;
}

function validateExternalUrl(urlStr: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
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

async function readTextWithLimit(response: globalThis.Response, limitBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > limitBytes) {
    throw new Error("Response too large");
  }

  if (!response.body) {
    return await response.text();
  }

  const reader = (response.body as any).getReader?.();
  if (!reader) {
    // Fallback: may allocate; still guarded by content-length when present.
    return await response.text();
  }

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > limitBytes) {
        try {
          reader.cancel();
        } catch {
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

async function fetchHtmlWithSafeRedirects(urlStr: string): Promise<{ finalUrl: string; html: string }> {
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
        if (!loc) throw new Error("Redirect without location");
        const next = new URL(loc, current);
        current = validateExternalUrl(next.toString());
        continue;
      }

      if (!res.ok) {
        throw new Error(`Upstream fetch failed (${res.status})`);
      }

      const html = await readTextWithLimit(res as any, MAX_HTML_BYTES);
      return { finalUrl: current.toString(), html };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects");
}

const normalizePrice = (raw?: string) => {
  if (!raw) return undefined;
  const match = raw.replace(/,/g, "").match(/([\d\.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return undefined;
};

export const importListingFromUrl = async (req: Request, res: ExpressResponse) => {
  const { url } = req.body as { url?: string };
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

    const ogTitle =
      $('meta[property="og:title"]').attr("content") || $("title").text();
    const ogDesc =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const priceMeta =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('meta[property="og:price:amount"]').attr("content");
    const currencyMeta =
      $('meta[property="product:price:currency"]').attr("content") ||
      $('meta[property="og:price:currency"]').attr("content");

    // Heuristic price extraction from visible text if meta missing
    const priceText =
      priceMeta || $('[class*="price"], [id*="price"]').first().text();
    const price = normalizePrice(priceText);
    const currency =
      currencyMeta ||
      (priceText?.includes("£")
        ? "GBP"
        : priceText?.includes("$")
          ? "USD"
          : undefined);

    // Grab first 4 images
    const images: string[] = [];
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
    const possibleLocation =
      $('[class*="location"], [id*="location"]').first().text().trim() || "";

    res.json({
      sourceUrl: finalUrl,
      title: ogTitle?.trim(),
      description: ogDesc?.trim(),
      price: price || null,
      currency: currency || "GBP",
      images: images.filter(Boolean),
      location: possibleLocation || undefined,
    });
  } catch (error) {
    console.error("[ImportListing] Failed to import", error);
    res.status(500).json({ error: "Failed to import listing from URL" });
  }
};

/**
 * Create a new listing (any domain)
 */
export const createListing = async (req: Request, res: ExpressResponse) => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const listingData = req.body;

    // Validate required fields
    if (
      !listingData.domain ||
      !listingData.title ||
      !listingData.price ||
      !listingData.location
    ) {
      res
        .status(400)
        .json({
          error: "Missing required fields: domain, title, price, location",
        });
      return;
    }

    // Create listing document
    const newListing = {
      ...listingData,
      ownerUid: user.uid,
      status: listingData.status || "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Add to Firestore
    const docRef = await db.collection("listings").add(newListing);

    logger.debug(`✅ Created listing ${docRef.id} for user ${user.uid}`);

    res.status(201).json({
      success: true,
      id: docRef.id,
      message: "Listing created successfully",
    });
  } catch (error) {
    console.error("[CreateListing] Error:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
};

/**
 * Update an existing listing
 */
export const updateListing = async (req: Request, res: ExpressResponse) => {
  try {
    const user = (req as any).user;
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
    const listingRef = db.collection("listings").doc(id);
    const listing = await listingRef.get();

    if (!listing.exists) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listingData = listing.data();
    if (listingData?.ownerUid !== user.uid) {
      res.status(403).json({ error: "Not authorized to update this listing" });
      return;
    }

    // Update listing
    await listingRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.debug(`✅ Updated listing ${id}`);

    res.json({
      success: true,
      message: "Listing updated successfully",
    });
  } catch (error) {
    console.error("[UpdateListing] Error:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
};

/**
 * Delete a listing
 */
export const deleteListing = async (req: Request, res: ExpressResponse) => {
  try {
    const user = (req as any).user;
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
    const listingRef = db.collection("listings").doc(id);
    const listing = await listingRef.get();

    if (!listing.exists) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listingData = listing.data();
    if (listingData?.ownerUid !== user.uid) {
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
  } catch (error) {
    console.error("[DeleteListing] Error:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
};

/**
 * Get user's listings
 */
export const getUserListings = async (req: Request, res: ExpressResponse) => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { domain, status, limit = 50 } = req.query;

    let query: FirebaseFirestore.Query = db
      .collection("listings")
      .where("ownerUid", "==", user.uid);

    if (domain) {
      query = query.where("domain", "==", domain);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("createdAt", "desc").limit(parseInt(limit as string));

    const snapshot = await query.get();

    const listings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("[GetUserListings] Error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
};

/**
 * Get single listing by ID
 */
export const getListingById = async (req: Request, res: ExpressResponse) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Listing ID required" });
      return;
    }

    const listingRef = db.collection("listings").doc(id);
    const listing = await listingRef.get();

    if (!listing.exists) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json({
      success: true,
      listing: {
        id: listing.id,
        ...listing.data(),
      },
    });
  } catch (error) {
    console.error("[GetListingById] Error:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
};
