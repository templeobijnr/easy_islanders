import type { Request, Response as ExpressResponse } from "express";
import { db } from "../config/firebase";

export type ListingImageDto = {
  imageId: string;
  url: string;
  ordering: number;
  type?: string;
  source?: string;
  hash?: string;
  width?: number;
  height?: number;
};

function normalizeUrlList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

/**
 * GET /listings/:id/images
 *
 * Contract:
 * - Returns ALL stored images for a listing
 * - Stable ordering
 * - Metadata fields when present
 *
 * Data sources (in order):
 * 1) listings/{id}/images subcollection (canonical)
 * 2) legacy listing doc arrays: images, imageUrls, photos, mediaUrls (best-effort)
 */
export async function getListingImages(req: Request, res: ExpressResponse): Promise<void> {
  const listingId = req.params.id;
  if (!listingId) {
    res.status(400).json({ error: "Listing ID required" });
    return;
  }

  // 1) Canonical subcollection
  const subSnap = await db
    .collection("listings")
    .doc(listingId)
    .collection("images")
    .orderBy("ordering", "asc")
    .get();

  if (!subSnap.empty) {
    const images: ListingImageDto[] = subSnap.docs.map((d) => {
      const data = d.data() as any;
      return {
        imageId: d.id,
        url: String(data.url || ""),
        ordering: Number(data.ordering ?? 0),
        type: data.type,
        source: data.source,
        hash: data.hash,
        width: data.width,
        height: data.height,
      };
    }).filter(i => Boolean(i.url));

    res.json({ success: true, listingId, images });
    return;
  }

  // 2) Legacy doc fields (best-effort, still "ALL stored" as per doc)
  const listingDoc = await db.collection("listings").doc(listingId).get();
  if (!listingDoc.exists) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const listing = listingDoc.data() as any;
  const urls = [
    ...normalizeUrlList(listing.images),
    ...normalizeUrlList(listing.imageUrls),
    ...normalizeUrlList(listing.photos),
    ...normalizeUrlList(listing.mediaUrls),
  ];

  // Deduplicate but keep first-seen order (stable)
  const seen = new Set<string>();
  const unique = urls.filter((u) => {
    const key = String(u || "").trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const images: ListingImageDto[] = unique.map((url, idx) => ({
    imageId: `legacy_${idx}`,
    url,
    ordering: idx,
    type: "unknown",
    source: "legacy_field",
  }));

  res.json({ success: true, listingId, images, source: "legacy_fields" });
}




