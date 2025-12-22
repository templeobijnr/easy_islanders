import { getErrorMessage } from '../../utils/errors';
/**
 * Knowledge Ingestion Service (V1)
 *
 * Runs in an async Task Queue worker:
 * - Extract text from a source (Storage/text/url)
 * - Chunk + hash for idempotency
 * - Embed chunks
 * - Persist chunks and finalize doc status
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFunctions } from "firebase-admin/functions";
import * as admin from "firebase-admin";
import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

import { knowledgeRepository } from "../../repositories/knowledge.repository";
import { businessRepository } from "../../repositories/business.repository";
import { DEFAULT_LIMITS } from "../../types/limits";
import { embedText } from "./embedding.service";
import { catalogExtractionService } from "./catalog-extraction.service";
import { KnowledgeDoc } from "../../types/knowledge";
import { setRequestContext } from "../../utils/request-context";
import { log } from "../../utils/log";

export interface KnowledgeIngestTaskPayload {
  businessId: string;
  docId: string;
}

const INGEST_TASK_FUNCTION_NAME = "ingestKnowledgeDoc";
const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 150;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const nextPeriod = text.indexOf(".", end);
      const nextNewline = text.indexOf("\n", end);
      const candidates = [
        nextPeriod > -1 ? nextPeriod + 1 : text.length,
        nextNewline > -1 ? nextNewline : text.length,
      ];
      const boundary = Math.min(...candidates);
      if (boundary - end < 200) {
        end = boundary;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= 50) {
      chunks.push(chunk);
    }

    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

function parseGsPath(filePath: string): {
  bucket?: string;
  objectPath: string;
} {
  if (filePath.startsWith("gs://")) {
    const withoutScheme = filePath.slice("gs://".length);
    const firstSlash = withoutScheme.indexOf("/");
    if (firstSlash === -1) {
      return { bucket: withoutScheme, objectPath: "" };
    }
    const bucket = withoutScheme.slice(0, firstSlash);
    const objectPath = withoutScheme.slice(firstSlash + 1);
    return { bucket, objectPath };
  }

  return { objectPath: filePath.replace(/^\/+/, "") };
}

async function downloadFromStorage(filePath: string): Promise<{
  buffer: Buffer;
  mimeType?: string;
  sizeBytes?: number;
}> {
  const { bucket: bucketName, objectPath } = parseGsPath(filePath);
  if (!objectPath) {
    throw new Error("Invalid filePath (missing object path)");
  }

  const bucket = bucketName
    ? admin.storage().bucket(bucketName)
    : admin.storage().bucket();
  const file = bucket.file(objectPath);

  const [metadata] = await file.getMetadata();
  const sizeBytes =
    typeof metadata.size === "string"
      ? parseInt(metadata.size, 10)
      : typeof metadata.size === "number"
        ? metadata.size
        : undefined;
  const mimeType = metadata.contentType;

  if (typeof sizeBytes === "number") {
    const maxBytes = DEFAULT_LIMITS.maxUploadMB * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      throw new Error(
        `Upload too large (${sizeBytes} bytes), max ${maxBytes} bytes`,
      );
    }
  }

  const [buffer] = await file.download();
  return { buffer, mimeType, sizeBytes };
}

async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    },
    [
      "Extract ALL text from this image (menus, prices, policies, hours, contact info).",
      "Return plain text; preserve prices exactly as shown.",
    ].join("\n"),
  ]);

  return result.response.text();
}

async function extractTextFromPdf(
  pdfBuffer: Buffer,
): Promise<{ text: string; pageCount?: number; usedVisionFallback: boolean }> {
  // Cheap-first: try local PDF text extraction if pdf-parse is available.
  // Fallback to Gemini extraction if the text looks corrupt/empty.
  try {
    const pdfParse = require("pdf-parse") as any;
    const parsed = await pdfParse(pdfBuffer);
    const extracted = typeof parsed?.text === "string" ? parsed.text : "";
    const pageCount =
      typeof parsed?.numpages === "number" ? parsed.numpages : undefined;

    if (
      typeof pageCount === "number" &&
      pageCount > DEFAULT_LIMITS.maxPdfPages
    ) {
      throw new Error(
        `PDF too long (${pageCount} pages), max ${DEFAULT_LIMITS.maxPdfPages}`,
      );
    }

    const cleaned = normalizeText(extracted);
    const replacementChars = (cleaned.match(/\uFFFD/g) || []).length;
    const charsPerPage = pageCount
      ? Math.floor(cleaned.length / Math.max(1, pageCount))
      : cleaned.length;
    const looksBad =
      cleaned.length < 200 || replacementChars > 0 || charsPerPage < 50;

    if (!looksBad) {
      return { text: cleaned, pageCount, usedVisionFallback: false };
    }
  } catch (error: unknown) {
    log.info(
      "[KnowledgeIngestion] PDF local extraction unavailable/failed, falling back to Gemini",
      {
        message: getErrorMessage(error),
      },
    );
  }

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf",
      },
    },
    [
      "Extract ALL text from this PDF document.",
      "Include menus, prices, policies, hours, contact info.",
      "Return plain text; preserve prices exactly as shown.",
    ].join("\n"),
  ]);

  return {
    text: normalizeText(result.response.text()),
    usedVisionFallback: true,
  };
}

async function extractTextFromUrl(url: string): Promise<string> {
  // P1: SSRF guard (V1)
  // - allow only https://
  // - block localhost/private IPs/metadata hosts
  // - enforce max content size and timeout
  const MAX_BYTES = 250_000;
  const MAX_REDIRECTS = 5;

  const isPrivateOrLocalAddress = (ip: string): boolean => {
    const ipVersion = net.isIP(ip);
    if (!ipVersion) return true;

    // IPv4 ranges
    if (ipVersion === 4) {
      const [a, b] = ip.split(".").map((v) => parseInt(v, 10));
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
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  };

  const assertUrlAllowed = async (rawUrl: string): Promise<URL> => {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== "https:") {
      throw new Error("URL_NOT_ALLOWED: only https URLs are allowed");
    }

    if (parsed.username || parsed.password) {
      throw new Error("URL_NOT_ALLOWED: credentials in URL are not allowed");
    }

    if (parsed.port && parsed.port !== "443") {
      throw new Error("URL_NOT_ALLOWED: non-443 ports are not allowed");
    }

    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = new Set([
      "localhost",
      "metadata.google.internal",
      "metadata",
      "169.254.169.254",
    ]);
    if (blockedHosts.has(hostname) || hostname.endsWith(".local")) {
      throw new Error("URL_NOT_ALLOWED: host is not allowed");
    }

    // If hostname is an IP literal, validate directly.
    if (net.isIP(hostname)) {
      if (isPrivateOrLocalAddress(hostname)) {
        throw new Error("URL_NOT_ALLOWED: private IPs are not allowed");
      }
      return parsed;
    }

    // DNS resolve and block private ranges (best-effort).
    const resolved = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS_TIMEOUT")), 1500),
      ),
    ]);

    if (!Array.isArray(resolved) || resolved.length === 0) {
      throw new Error("URL_NOT_ALLOWED: failed to resolve host");
    }

    for (const record of resolved) {
      if (isPrivateOrLocalAddress(record.address)) {
        throw new Error("URL_NOT_ALLOWED: host resolves to a private IP");
      }
    }

    return parsed;
  };

  const readTextWithLimit = async (
    res: Response,
    maxBytes: number,
  ): Promise<string> => {
    const contentLengthHeader = res.headers.get("content-length");
    if (contentLengthHeader) {
      const size = parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(size) && size > maxBytes) {
        throw new Error("URL_TOO_LARGE");
      }
    }

    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error("URL_TOO_LARGE");
      }
      chunks.push(value);
    }

    const all = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(all);
  };

  let current = await assertUrlAllowed(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    let redirects = 0;
    let res: Response;

    while (true) {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "EasyIslandersBot/1.0",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          throw new Error(
            `URL_FETCH_FAILED: redirect without location (${res.status})`,
          );
        }

        redirects += 1;
        if (redirects > MAX_REDIRECTS) {
          throw new Error("URL_FETCH_FAILED: too many redirects");
        }

        current = await assertUrlAllowed(new URL(location, current).toString());
        continue;
      }

      break;
    }

    if (!res.ok) {
      throw new Error(`URL_FETCH_FAILED: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    const bodyText = await readTextWithLimit(res, MAX_BYTES);

    if (contentType.includes("text/html")) {
      const $ = cheerio.load(bodyText);
      $("script,style,noscript").remove();
      const text = $("body").text();
      return normalizeText(text.replace(/\s+/g, " "));
    }

    return normalizeText(bodyText);
  } catch (error: unknown) {
    if (String(getErrorMessage(error) || "").startsWith("URL_NOT_ALLOWED")) {
      throw error;
    }
    if (String(getErrorMessage(error) || "") === "URL_TOO_LARGE") {
      throw new Error("URL_NOT_ALLOWED: content too large");
    }
    if (String(getErrorMessage(error) || "") === "DNS_TIMEOUT") {
      throw new Error("URL_NOT_ALLOWED: DNS lookup timed out");
    }
    log.info("[KnowledgeIngestion] URL extraction failed", {
      message: getErrorMessage(error),
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractTextForDoc(
  doc: KnowledgeDoc,
): Promise<{ text: string; mimeType?: string; pageCount?: number }> {
  switch (doc.sourceType) {
    case "text": {
      if (!doc.sourceText) {
        throw new Error("Missing sourceText for text knowledge doc");
      }
      return { text: normalizeText(doc.sourceText), mimeType: "text/plain" };
    }
    case "url": {
      if (!doc.sourceUrl) {
        throw new Error("Missing sourceUrl for url knowledge doc");
      }
      const text = await extractTextFromUrl(doc.sourceUrl);
      return { text, mimeType: "text/plain" };
    }
    case "image": {
      if (!doc.filePath) {
        throw new Error("Missing filePath for image knowledge doc");
      }
      const file = await downloadFromStorage(doc.filePath);
      const mimeType = doc.mimeType || file.mimeType || "image/jpeg";
      const text = await extractTextFromImage(file.buffer, mimeType);
      return { text: normalizeText(text), mimeType };
    }
    case "pdf": {
      if (!doc.filePath) {
        throw new Error("Missing filePath for pdf knowledge doc");
      }
      const file = await downloadFromStorage(doc.filePath);
      const extracted = await extractTextFromPdf(file.buffer);
      return {
        text: extracted.text,
        mimeType: "application/pdf",
        pageCount: extracted.pageCount,
      };
    }
    case "file": {
      // Generic file type - determine actual type from mimeType
      if (!doc.filePath) {
        throw new Error("Missing filePath for file knowledge doc");
      }
      const file = await downloadFromStorage(doc.filePath);
      const mimeType =
        doc.mimeType || file.mimeType || "application/octet-stream";

      if (mimeType.startsWith("image/")) {
        const text = await extractTextFromImage(file.buffer, mimeType);
        return { text: normalizeText(text), mimeType };
      } else if (mimeType === "application/pdf") {
        const extracted = await extractTextFromPdf(file.buffer);
        return {
          text: extracted.text,
          mimeType,
          pageCount: extracted.pageCount,
        };
      } else {
        // Treat as text file
        const text = file.buffer.toString("utf-8");
        return { text: normalizeText(text), mimeType: "text/plain" };
      }
    }
    default: {
      const neverType: never = doc.sourceType;
      throw new Error(`Unsupported sourceType: ${neverType}`);
    }
  }
}

export async function enqueueKnowledgeDocIngestion(
  businessId: string,
  docId: string,
): Promise<void> {
  const queue = getFunctions().taskQueue<KnowledgeIngestTaskPayload>(
    `locations/europe-west1/functions/${INGEST_TASK_FUNCTION_NAME}`,
  );
  await queue.enqueue(
    { businessId, docId },
    { dispatchDeadlineSeconds: 30 * 60 },
  );
}

export async function processKnowledgeDocIngestion(
  payload: KnowledgeIngestTaskPayload,
): Promise<void> {
  const { businessId, docId } = payload;

  setRequestContext({ businessId, docId });
  log.info("[KnowledgeIngestion] Starting ingestion");

  const doc = await knowledgeRepository.getDoc(businessId, docId);
  if (!doc) {
    log.warn("[KnowledgeIngestion] Doc not found, skipping");
    return;
  }

  if (doc.status !== "processing") {
    log.info("[KnowledgeIngestion] Doc not in processing state, skipping", {
      status: doc.status,
    });
    return;
  }

  try {
    const extracted = await extractTextForDoc(doc);
    const normalized = normalizeText(extracted.text);

    if (normalized.length < 50) {
      throw new Error("Extracted text too short to ingest");
    }

    const contentHash = sha256Hex(normalized);
    const rawChunks = chunkText(
      normalized,
      DEFAULT_CHUNK_SIZE,
      DEFAULT_CHUNK_OVERLAP,
    );

    // De-dupe chunks by text hash (idempotent task retries)
    const unique: Array<{ text: string; textHash: string }> = [];
    const seen = new Set<string>();
    for (const chunk of rawChunks) {
      const textHash = sha256Hex(chunk);
      if (seen.has(textHash)) continue;
      seen.add(textHash);
      unique.push({ text: chunk, textHash });
    }

    // Enforce per-business chunk cap (excluding this doc's already-active chunks)
    const [totalActive, activeForDoc] = await Promise.all([
      knowledgeRepository.countActiveChunks(businessId),
      knowledgeRepository.countActiveChunksForDoc(businessId, docId),
    ]);
    const otherActive = Math.max(0, totalActive - activeForDoc);

    if (otherActive + unique.length > DEFAULT_LIMITS.maxChunks) {
      throw new Error(
        `Chunk limit exceeded: ${otherActive}+${unique.length} > ${DEFAULT_LIMITS.maxChunks}`,
      );
    }

    // Embed + write chunks (deterministic ids via textHash)
    const startEmbed = Date.now();
    const buffered: any[] = [];
    const BATCH_SIZE = 75;

    for (let i = 0; i < unique.length; i++) {
      const { text, textHash } = unique[i];
      const embedding = await embedText(text);

      buffered.push({
        businessId,
        docId,
        sourceName: doc.sourceName,
        sourceType: doc.sourceType,
        status: "active",
        chunkIndex: i,
        text,
        textHash,
        embedding,
      });

      if (buffered.length >= BATCH_SIZE) {
        await knowledgeRepository.writeChunksBatch(businessId, docId, buffered);
        buffered.length = 0;
      }
    }

    if (buffered.length > 0) {
      await knowledgeRepository.writeChunksBatch(businessId, docId, buffered);
    }

    const embedLatencyMs = Date.now() - startEmbed;
    log.info("[KnowledgeIngestion] Embedded and wrote chunks", {
      chunkCount: unique.length,
      embedLatencyMs,
    });

    await knowledgeRepository.finalizeDocSuccess(businessId, docId, {
      chunkCount: unique.length,
      contentHash,
      mimeType: extracted.mimeType,
      pageCount: extracted.pageCount,
    });

    log.info("[KnowledgeIngestion] Doc finalized", { status: "active" });

    // === CATALOG EXTRACTION (isolated - failure doesn't fail ingestion) ===
    if (doc.extractCatalog === true) {
      try {
        await knowledgeRepository.updateDoc(businessId, docId, {
          "catalogExtraction.status": "processing",
        });

        // Get business to determine marketId and industryDomain
        const business = await businessRepository.getById(businessId);
        if (!business) {
          throw new Error("Business not found for catalog extraction");
        }

        const extractionResult = await catalogExtractionService.extractAndSave(
          businessId,
          business.marketId || "nc.kyrenia",
          (business.category as any) || "food",
          normalized,
          docId,
        );

        await knowledgeRepository.updateDoc(businessId, docId, {
          "catalogExtraction.status": "done",
          "catalogExtraction.extractedCount": extractionResult.items.length,
          "catalogExtraction.extractionRunId": extractionResult.extractionRunId,
        });

        log.info("[KnowledgeIngestion] Catalog extraction complete", {
          itemCount: extractionResult.items.length,
          runId: extractionResult.extractionRunId,
        });
      } catch (extractError: unknown) {
        log.error(
          "[KnowledgeIngestion] Catalog extraction failed (non-fatal)",
          extractError,
        );

        await knowledgeRepository.updateDoc(businessId, docId, {
          "catalogExtraction.status": "failed",
          "catalogExtraction.error": {
            code: "EXTRACT_FAILED",
            message: getErrorMessage(extractError) || "Extraction failed",
          },
        });
      }
    } else {
      await knowledgeRepository.updateDoc(businessId, docId, {
        "catalogExtraction.status": "skipped",
      });
    }
  } catch (error: unknown) {
    log.error("[KnowledgeIngestion] Ingestion failed", error);

    await knowledgeRepository.updateDocStatus(businessId, docId, "failed", {
      code: "INGEST_FAILED",
      message: getErrorMessage(error) || "Ingestion failed",
    });

    throw error;
  }
}

export const knowledgeIngestionService = {
  enqueueKnowledgeDocIngestion,
  processKnowledgeDocIngestion,
};
