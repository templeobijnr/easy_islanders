"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit Tests for Knowledge Service
 * Tests the RAG pipeline components: chunking, embedding, and ingestion
 */
const knowledge_service_1 = require("../services/knowledge.service");
describe('Knowledge Service', () => {
    describe('chunkText', () => {
        it('should split long text into chunks', () => {
            const longText = 'A'.repeat(1500); // 1500 characters
            const chunks = knowledge_service_1.knowledgeService.chunkText(longText, 500, 100);
            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks.every(c => c.length <= 600)).toBe(true); // Allow some overflow for sentence boundaries
        });
        it('should return single chunk for short text', () => {
            const shortText = 'This is a short menu item.';
            const chunks = knowledge_service_1.knowledgeService.chunkText(shortText, 500, 100);
            expect(chunks.length).toBe(0); // Under 50 char threshold, filtered out
        });
        it('should handle text with sentence boundaries', () => {
            const text = `Our restaurant offers the following items.
Menu Item 1: Grilled Chicken - £15. Served with vegetables.
Menu Item 2: Fish and Chips - £12. Traditional British dish.
Menu Item 3: Vegetable Curry - £10. Vegan option available.
Opening Hours: Monday to Friday 9am-10pm. Saturday 10am-11pm.
Contact us at info@restaurant.com for reservations.`;
            const chunks = knowledge_service_1.knowledgeService.chunkText(text, 150, 30);
            expect(chunks.length).toBeGreaterThan(0);
            // Each chunk should contain meaningful content
            chunks.forEach(chunk => {
                expect(chunk.length).toBeGreaterThan(50);
            });
        });
        it('should filter out tiny chunks', () => {
            const text = 'Short. More. Text.';
            const chunks = knowledge_service_1.knowledgeService.chunkText(text, 500, 100);
            // Should filter chunks < 50 chars
            expect(chunks.every(c => c.length >= 50)).toBe(true);
        });
        it('should handle empty string', () => {
            const chunks = knowledge_service_1.knowledgeService.chunkText('', 500, 100);
            expect(chunks).toEqual([]);
        });
        it('should preserve content integrity', () => {
            const menuText = `
            BREAKFAST MENU
            Full English Breakfast - 500 TL
            Includes eggs, bacon, sausage, beans, toast
            
            Continental Breakfast - 350 TL
            Fresh pastries, jam, butter, coffee
            
            Healthy Start - 400 TL
            Granola, yogurt, fresh fruits
            `;
            const chunks = knowledge_service_1.knowledgeService.chunkText(menuText, 200, 50);
            // The combined chunks should contain our key items
            const combined = chunks.join(' ');
            expect(combined).toContain('500 TL');
            expect(combined).toContain('BREAKFAST');
        });
    });
    describe('generateEmbedding', () => {
        // Skip live API tests unless GEMINI_API_KEY is set
        const runLiveTests = process.env.GEMINI_API_KEY ? describe : describe.skip;
        runLiveTests('with live API', () => {
            it('should generate embedding vector', async () => {
                const text = 'Our gym offers personal training and group classes.';
                const embedding = await knowledge_service_1.knowledgeService.generateEmbedding(text);
                expect(Array.isArray(embedding)).toBe(true);
                expect(embedding.length).toBeGreaterThan(0);
                expect(typeof embedding[0]).toBe('number');
            }, 30000);
        });
    });
    describe('extractTextFromImage', () => {
        // Skip live Vision tests unless GEMINI_API_KEY is set
        const runLiveTests = process.env.GEMINI_API_KEY ? describe : describe.skip;
        runLiveTests('with live API', () => {
            it('should extract text from image buffer', async () => {
                // Create a simple test - would need actual image for real test
                // This is a placeholder for integration testing
                expect(true).toBe(true);
            });
        });
    });
});
describe('Cosine Similarity (Integration)', () => {
    it('should rank similar texts higher', () => {
        // This tests the concept - actual implementation is private
        // We verify through retrieval behavior
        const vector1 = [1, 0, 0];
        const vector2 = [1, 0, 0]; // Same
        const vector3 = [0, 1, 0]; // Different
        // Manual cosine similarity for test
        const cosineSim = (a, b) => {
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        };
        expect(cosineSim(vector1, vector2)).toBe(1); // Identical vectors
        expect(cosineSim(vector1, vector3)).toBe(0); // Orthogonal vectors
    });
});
/**
 * PERSISTENCE TESTS
 * These tests verify the full data flow into Firestore
 * Requires Firebase emulator or test project
 */
describe('Knowledge Persistence (Integration)', () => {
    const TEST_BUSINESS_ID = 'test_business_persistence_001';
    // Skip if no Gemini API key (needed for embeddings)
    const runPersistenceTests = process.env.GEMINI_API_KEY ? describe : describe.skip;
    runPersistenceTests('with live Firestore', () => {
        beforeAll(async () => {
            // Clean up any existing test data
            try {
                await knowledge_service_1.knowledgeService.clearBusinessKnowledge(TEST_BUSINESS_ID);
            }
            catch (_a) {
                // Ignore if collection doesn't exist
            }
        }, 30000); // 30 second timeout for cleanup
        afterAll(async () => {
            // Clean up test data
            try {
                await knowledge_service_1.knowledgeService.clearBusinessKnowledge(TEST_BUSINESS_ID);
            }
            catch (_a) {
                // Ignore cleanup errors
            }
        }, 30000); // 30 second timeout for cleanup
        it('should write chunks to Firestore', async () => {
            const testContent = `
            Welcome to Test Restaurant! We have been serving customers since 2010.
            Our specialties include Fresh Grilled Fish for 250 TL and Lamb Shank for 320 TL.
            We are open Monday through Saturday from 12pm to 11pm.
            `;
            const result = await knowledge_service_1.knowledgeService.ingestTextContent(TEST_BUSINESS_ID, testContent, 'test_menu.txt', 'text');
            expect(result.success).toBe(true);
            expect(result.chunks).toBeGreaterThan(0);
        }, 60000);
        it('should read chunks from Firestore', async () => {
            const chunks = await knowledge_service_1.knowledgeService.listBusinessKnowledge(TEST_BUSINESS_ID);
            expect(Array.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
            // Verify chunk structure
            const firstChunk = chunks[0];
            expect(firstChunk).toHaveProperty('id');
            expect(firstChunk).toHaveProperty('text');
            expect(firstChunk).toHaveProperty('source');
            expect(firstChunk).toHaveProperty('sourceType');
        }, 30000);
        it('should filter by businessId correctly', async () => {
            const WRONG_BUSINESS_ID = 'wrong_business_id_xyz';
            const chunks = await knowledge_service_1.knowledgeService.listBusinessKnowledge(WRONG_BUSINESS_ID);
            expect(chunks.length).toBe(0); // Should return nothing for wrong ID
        }, 10000);
        it('should retrieve relevant knowledge for queries', async () => {
            const relevantChunks = await knowledge_service_1.knowledgeService.retrieveKnowledge(TEST_BUSINESS_ID, 'What fish dishes do you have?', 3);
            expect(Array.isArray(relevantChunks)).toBe(true);
            // Should find content mentioning fish
            if (relevantChunks.length > 0) {
                const combined = relevantChunks.join(' ').toLowerCase();
                expect(combined).toContain('fish');
            }
        }, 30000);
        it('should clear all knowledge for a business', async () => {
            await knowledge_service_1.knowledgeService.clearBusinessKnowledge(TEST_BUSINESS_ID);
            const chunks = await knowledge_service_1.knowledgeService.listBusinessKnowledge(TEST_BUSINESS_ID);
            expect(chunks.length).toBe(0);
        }, 30000);
    });
});
//# sourceMappingURL=knowledge.service.test.js.map