/**
 * Catalog Extraction Service
 *
 * Extracts catalog items (products/services) from business documents
 * using LLM and saves them to Firestore.
 *
 * Key features:
 * - Section-by-section extraction for long documents
 * - Deterministic IDs for idempotent upserts
 * - Source-scoped replacement (doesn't touch manual items)
 * - Uses 'unknown' priceType when price not specified
 */

import { createHash } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '../../utils/log';
import { CatalogItemInput } from '../../types/catalog';
import { catalogRepository } from '../../repositories/catalog.repository';
import {
    IndustryDomain,
    Currency,
    PriceType,
    getDefaultOfferingType,
    getDefaultActionType,
    isValidCurrency,
    isValidPriceType,
} from '../../taxonomy';

// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_ITEMS_PER_DOC = 500;
const SECTION_MAX_CHARS = 8000;

// ============================================================================
// TYPES
// ============================================================================
interface ExtractedItem {
    name: string;
    section: string;
    subsection?: string;
    description?: string;
    price: number | null;
    currency: Currency | null;
    priceType: PriceType;
    tags?: string[];
}

interface ExtractionResult {
    items: Array<CatalogItemInput & { id: string }>;
    extractionRunId: string;
}

// ============================================================================
// HELPERS
// ============================================================================
function sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate deterministic ID for an extracted item
 */
function generateItemId(
    businessId: string,
    sourceDocId: string,
    section: string,
    name: string,
    price: number | null,
    priceType: string
): string {
    const normalized = [
        businessId,
        sourceDocId,
        section.toLowerCase().trim(),
        name.toLowerCase().trim(),
        String(price ?? 'null'),
        priceType
    ].join('|');

    return sha256Hex(normalized).substring(0, 20);
}

/**
 * Split document by section headers
 */
function splitBySections(text: string): Array<{ header: string; text: string }> {
    const lines = text.split('\n');
    const sections: Array<{ header: string; text: string }> = [];
    let currentHeader = 'General';
    let currentText: string[] = [];

    for (const line of lines) {
        // Check if line looks like a header
        const trimmed = line.trim();
        if (
            trimmed.length > 0 &&
            trimmed.length < 100 &&
            (
                /^[A-Z][A-Z\s&]+$/.test(trimmed) ||  // ALL CAPS
                trimmed.endsWith(':') ||
                /^#{1,3}\s+/.test(trimmed)
            )
        ) {
            // Save previous section if has content
            if (currentText.length > 0) {
                sections.push({ header: currentHeader, text: currentText.join('\n') });
            }
            currentHeader = trimmed.replace(/^#{1,3}\s+/, '').replace(/:$/, '');
            currentText = [];
        } else {
            currentText.push(line);
        }
    }

    // Save last section
    if (currentText.length > 0) {
        sections.push({ header: currentHeader, text: currentText.join('\n') });
    }

    // Filter empty sections and limit size
    return sections
        .filter(s => s.text.trim().length > 20)
        .map(s => ({
            header: s.header,
            text: s.text.substring(0, SECTION_MAX_CHARS)
        }));
}

/**
 * Get Gemini AI instance
 */
function getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract items from a section using LLM
 */
async function extractItemsFromSection(
    sectionText: string,
    sectionHeader: string,
    industryDomain: IndustryDomain
): Promise<ExtractedItem[]> {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Extract catalog items from this document section.

BUSINESS TYPE: ${industryDomain}
SECTION: ${sectionHeader}

RULES:
1. Extract name, description exactly as written
2. For prices:
   - If explicit price shown: use priceType "fixed"
   - If "from X" or "starting at": use priceType "from"
   - If per hour: use priceType "hourly"
   - If per person: use priceType "per_person"
   - If explicitly free: use priceType "free"
   - If price NOT shown: use priceType "unknown" with price: null
3. Currency: TRY unless explicitly stated (GBP, EUR, USD)
4. Tags: only if clearly indicated

OUTPUT: JSON array only, no markdown:
[{
  "name": "...",
  "section": "${sectionHeader}",
  "subsection": null,
  "description": "...",
  "price": 350 or null,
  "currency": "TRY" or null,
  "priceType": "fixed|from|hourly|per_person|free|unknown",
  "tags": []
}]

DOCUMENT:
${sectionText}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            log.warn('[CatalogExtraction] No JSON array in LLM response');
            return [];
        }

        const items = JSON.parse(jsonMatch[0]) as ExtractedItem[];

        // Validate and sanitize
        return items
            .filter(item => item.name && item.name.trim().length > 0)
            .map(item => ({
                name: item.name.trim(),
                section: item.section || sectionHeader,
                subsection: item.subsection?.trim() || undefined,
                description: item.description?.trim() || undefined,
                price: typeof item.price === 'number' ? item.price : null,
                currency: isValidCurrency(item.currency as string) ? item.currency : null,
                priceType: isValidPriceType(item.priceType) ? item.priceType : 'unknown',
                tags: Array.isArray(item.tags) ? item.tags : undefined,
            }));
    } catch (error) {
        log.error('[CatalogExtraction] LLM extraction failed', error);
        return [];
    }
}

// ============================================================================
// MAIN SERVICE
// ============================================================================
export const catalogExtractionService = {
    /**
     * Extract items from document text and save to catalog
     */
    async extractAndSave(
        businessId: string,
        marketId: string,
        industryDomain: IndustryDomain,
        documentText: string,
        sourceDocId: string
    ): Promise<ExtractionResult> {
        const extractionRunId = `run_${Date.now()}_${sha256Hex(sourceDocId).substring(0, 8)}`;

        log.info('[CatalogExtraction] Starting extraction', {
            businessId,
            sourceDocId,
            extractionRunId,
            textLength: documentText.length
        });

        // 1. Split by sections
        const sections = splitBySections(documentText);
        log.info('[CatalogExtraction] Split into sections', { sectionCount: sections.length });

        // 2. Extract items from each section
        const allExtracted: ExtractedItem[] = [];

        for (const section of sections) {
            const items = await extractItemsFromSection(
                section.text,
                section.header,
                industryDomain
            );
            allExtracted.push(...items);

            // Cap at max items
            if (allExtracted.length >= MAX_ITEMS_PER_DOC) {
                log.warn('[CatalogExtraction] Hit item limit', { limit: MAX_ITEMS_PER_DOC });
                break;
            }
        }

        // 3. Deduplicate by name + section
        const seen = new Set<string>();
        const deduplicated = allExtracted.filter(item => {
            const key = `${item.section.toLowerCase()}|${item.name.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        log.info('[CatalogExtraction] Extracted items', {
            raw: allExtracted.length,
            deduplicated: deduplicated.length
        });

        // 4. Convert to CatalogItemInput with deterministic IDs
        const items: Array<CatalogItemInput & { id: string }> = deduplicated.map(item => ({
            id: generateItemId(businessId, sourceDocId, item.section, item.name, item.price, item.priceType),
            businessId,
            marketId,
            industryDomain,
            offeringType: getDefaultOfferingType(industryDomain),
            actionType: getDefaultActionType(industryDomain),
            section: item.section,
            subsection: item.subsection,
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            priceType: item.priceType,
            tags: item.tags,
            source: {
                type: 'doc' as const,
                docId: sourceDocId,
                extractionRunId,
            },
        }));

        // 5. Deactivate previous extracted items from this doc
        const deactivatedCount = await catalogRepository.deactivatePreviousExtracted(
            businessId,
            sourceDocId,
            extractionRunId
        );

        if (deactivatedCount > 0) {
            log.info('[CatalogExtraction] Deactivated previous items', { count: deactivatedCount });
        }

        // 6. Upsert new items
        if (items.length > 0) {
            await catalogRepository.upsertExtractedItems(businessId, items);
        }

        log.info('[CatalogExtraction] Extraction complete', {
            extractedCount: items.length,
            extractionRunId
        });

        return {
            items,
            extractionRunId,
        };
    },

    /**
     * Extract items without saving (for testing/preview)
     */
    async extractOnly(
        documentText: string,
        industryDomain: IndustryDomain
    ): Promise<ExtractedItem[]> {
        const sections = splitBySections(documentText);
        const allItems: ExtractedItem[] = [];

        for (const section of sections) {
            const items = await extractItemsFromSection(
                section.text,
                section.header,
                industryDomain
            );
            allItems.push(...items);
        }

        return allItems;
    },
};
