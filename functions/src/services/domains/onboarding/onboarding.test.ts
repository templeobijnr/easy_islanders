import type { Thread, ThreadMessage } from '../../../types/thread.types';

// ============================================
// MOCKS
// ============================================

jest.mock('firebase-admin/firestore', () => {
    const mockStore = new Map<string, any>();

    // Helper to get/set
    const getStore = () => mockStore;

    // Helper to get all docs matching a collection path prefix
    const getDocsForCollection = (collPath: string) => {
        const prefix = collPath + '/';
        const docs: any[] = [];
        for (const [key, value] of mockStore.entries()) {
            if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
                const id = key.slice(prefix.length);
                docs.push({
                    id,
                    data: () => value,
                    ref: { path: key, id, delete: jest.fn(() => mockStore.delete(key)) },
                });
            }
        }
        return docs;
    };

    return {
        getFirestore: () => ({
            _store: getStore(),
            collection: jest.fn((path: string) => ({
                doc: jest.fn((id?: string) => {
                    const docPath = id ? `${path}/${id}` : `${path}/AUTO_ID`;
                    return {
                        path: docPath,
                        id: id || 'AUTO_ID',
                        get: jest.fn().mockImplementation(() => {
                            const data = mockStore.get(docPath);
                            return {
                                exists: !!data,
                                data: () => data,
                                id: id || 'AUTO_ID',
                            };
                        }),
                        set: jest.fn().mockImplementation((data: any) => {
                            mockStore.set(docPath, data);
                        }),
                        update: jest.fn().mockImplementation((data: any) => {
                            if (mockStore.has(docPath)) {
                                mockStore.set(docPath, { ...mockStore.get(docPath), ...data });
                            }
                        }),
                        delete: jest.fn().mockImplementation(() => {
                            mockStore.delete(docPath);
                        }),
                    };
                }),
                // Collection-level get() for querying all docs
                get: jest.fn().mockImplementation(async () => ({
                    docs: getDocsForCollection(path),
                })),
                // orderBy returns the same collection mock
                orderBy: jest.fn().mockReturnThis(),
                // count() for aggregation
                count: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        data: () => ({ count: getDocsForCollection(path).length }),
                    }),
                }),
            })),
            runTransaction: jest.fn((callback: any) => {
                const tx = {
                    get: jest.fn().mockImplementation((ref: any) => {
                        const path = ref.path;
                        const data = mockStore.get(path);
                        return Promise.resolve({
                            exists: !!data,
                            data: () => data,
                            id: ref.id,
                        });
                    }),
                    set: jest.fn().mockImplementation((ref: any, data: any, opts: any) => {
                        const path = ref.path;
                        if (opts?.merge && mockStore.has(path)) {
                            mockStore.set(path, { ...mockStore.get(path), ...data });
                        } else {
                            mockStore.set(path, data);
                        }
                    }),
                    update: jest.fn().mockImplementation((ref: any, data: any) => {
                        const path = ref.path;
                        if (mockStore.has(path)) {
                            mockStore.set(path, { ...mockStore.get(path), ...data });
                        }
                    }),
                    delete: jest.fn(),
                };
                return callback(tx);
            }),
            batch: jest.fn(() => {
                const ops: Array<() => void> = [];
                return {
                    set: jest.fn((ref: any, data: any) => {
                        ops.push(() => mockStore.set(ref.path, data));
                    }),
                    update: jest.fn((ref: any, data: any) => {
                        ops.push(() => {
                            if (mockStore.has(ref.path)) {
                                mockStore.set(ref.path, { ...mockStore.get(ref.path), ...data });
                            }
                        });
                    }),
                    delete: jest.fn((ref: any) => {
                        ops.push(() => mockStore.delete(ref.path));
                    }),
                    commit: jest.fn(async () => {
                        for (const op of ops) op();
                    }),
                };
            }),
        }),
        Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
    };
});

jest.mock('firebase-functions/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

jest.mock('../conversations/thread.repository', () => ({
    updateThreadState: jest.fn(),
}));

// IMPORTANT:
// Import modules AFTER mocks are registered.
// Static `import` is hoisted and would load real firebase-admin before mocks apply.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { opsService } = require('./ops.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { proposalsRepository } = require('./proposals.repository');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { updateThreadState } = require('../conversations/thread.repository');

// ============================================
// TESTS
// ============================================

describe('Ops Agent & Proposals', () => {
    let firestore: any;

    beforeEach(() => {
        jest.clearAllMocks();
        firestore = getFirestore();
        firestore._store.clear();
    });

    const threadId = 't_123';
    const businessId = 'b_123';

    // Helper to create thread
    const createThread = (onboardingState?: any): Thread => ({
        id: threadId,
        businessId,
        actorId: 'user_123',
        threadType: 'business_ops',
        status: 'active',
        state: 'idle',
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        lastMessageAt: {} as Timestamp,
        onboardingState,
        channels: ['whatsapp'],
    });

    describe('Ops Service FSM', () => {
        it('should init state to profile_required if missing', async () => {
            const thread = createThread();
            const message: ThreadMessage = {
                id: 'm_1', text: 'Hi', role: 'user', createdAt: {} as Timestamp,
                actorId: 'user_123', channel: 'whatsapp', direction: 'inbound',
                threadId: thread.id,
            };

            await opsService.processOpsMessage(thread, message);

            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({ step: 'profile_required' })
            }));
        });

        it('should create proposal when in profile_required and user sends text', async () => {
            const thread = createThread({ step: 'profile_required', businessId });
            const message: ThreadMessage = {
                id: 'm_sid', text: 'My Burger Shop', role: 'user', createdAt: {} as Timestamp,
                actorId: 'user_123', channel: 'whatsapp', direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Proposal');
            expect(response).toContain('My Burger Shop');
            // Check usage of updateThreadState to set pendingProposalId
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({ pendingProposalId: expect.any(String) })
            }));
        });

        it('should approve proposal on YES and advance step', async () => {
            // Setup: Proposal exists
            const proposalId = 'prop_123';
            const proposal = {
                id: proposalId,
                kind: 'business_profile_patch',
                status: 'proposed',
                patch: { name: 'Burger Shop' },
                threadId
            };
            firestore._store.set(`businesses/${businessId}/proposals/${proposalId}`, proposal);

            const thread = createThread({
                step: 'profile_required',
                businessId,
                pendingProposalId: proposalId
            });
            const message: ThreadMessage = {
                id: 'm_2', text: 'YES', role: 'user', createdAt: {} as Timestamp,
                actorId: 'user_123', channel: 'whatsapp', direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Approved');
            // Check repo applied the proposal
            const updatedProp = firestore._store.get(`businesses/${businessId}/proposals/${proposalId}`);
            expect(updatedProp.status).toBe('applied');

            // Check business doc updated
            const businessDoc = firestore._store.get(`businesses/${businessId}`);
            expect(businessDoc).toEqual(expect.objectContaining({ name: 'Burger Shop' }));

            // Check thread step advanced
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({ step: 'catalog_required' })
            }));
        });
        it('should reject proposal on NO and clear pending status', async () => {
            // Setup: Proposal exists
            const proposalId = 'prop_reject_me';
            const proposal = {
                id: proposalId,
                kind: 'business_profile_patch',
                status: 'proposed',
                patch: { name: 'Wrong Name' },
                threadId
            };
            firestore._store.set(`businesses/${businessId}/proposals/${proposalId}`, proposal);

            const thread = createThread({
                step: 'profile_required',
                businessId,
                pendingProposalId: proposalId
            });
            const message: ThreadMessage = {
                id: 'm_no', text: 'NO', role: 'user', createdAt: {} as Timestamp,
                actorId: 'user_123', channel: 'whatsapp', direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Rejected');

            // Check repo marked as rejected
            const updatedProp = firestore._store.get(`businesses/${businessId}/proposals/${proposalId}`);
            expect(updatedProp.status).toBe('rejected');

            // Check thread pendingProposalId cleared, but step remains same
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({
                    step: 'profile_required',
                    pendingProposalId: undefined
                })
            }));
        });

        it('should be retry-safe when user sends YES twice (Idempotency)', async () => {
            // Setup: Proposal exists
            const proposalId = 'prop_retry';
            const proposal = {
                id: proposalId,
                kind: 'business_profile_patch',
                status: 'proposed',
                patch: { name: 'Retry Shop' },
                threadId
            };
            firestore._store.set(`businesses/${businessId}/proposals/${proposalId}`, proposal);

            const thread = createThread({
                step: 'profile_required',
                businessId,
                pendingProposalId: proposalId
            });
            const message: ThreadMessage = {
                id: 'm_yes_retry', text: 'YES', role: 'user', createdAt: {} as Timestamp,
                actorId: 'user_123', channel: 'whatsapp', direction: 'inbound',
                threadId: thread.id,
            };

            // First Call
            await opsService.processOpsMessage(thread, message);

            // Verify First Apply
            expect(firestore._store.get(`businesses/${businessId}/proposals/${proposalId}`).status).toBe('applied');
            expect(firestore._store.get(`businesses/${businessId}`).name).toBe('Retry Shop');

            // Reset mocks to track second call effects
            (updateThreadState as jest.Mock).mockClear();

            // Second Call (Replay with SAME thread state, simulating race or duplicate delivery before state update persisted/read)
            const response2 = await opsService.processOpsMessage(thread, message);

            expect(response2).toContain('Approved'); // Should still say approved

            // Verify NO duplicate business update (using timestamp check or similar if we could, 
            // but here checking it didn't error and state matches expectation)

            // Proposal should remain applied
            expect(firestore._store.get(`businesses/${businessId}/proposals/${proposalId}`).status).toBe('applied');

            // Thread should try to update to catalog_required AGAIN (idempotent state transition)
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({ step: 'catalog_required' })
            }));
        });
    });

    describe('Proposals Repository', () => {
        it('should be idempotent (return existing proposal)', async () => {
            const input = {
                businessId,
                threadId,
                messageSid: 'sid_1',
                actorId: 'u_1',
                kind: 'catalog_upsert' as const,
                patch: {},
                summary: 'test'
            };

            // First call
            const p1 = await proposalsRepository.createIfAbsent(input);
            // Second call
            const p2 = await proposalsRepository.createIfAbsent(input);

            expect(p1.id).toBe(p2.id);
        });

        it('should fail apply if proposal not Proposed', async () => {
            const proposalId = 'prop_rejected';
            firestore._store.set(`businesses/${businessId}/proposals/${proposalId}`, {
                id: proposalId,
                status: 'rejected',
                kind: 'business_profile_patch'
            });

            const result = await proposalsRepository.approveAndApply(businessId, proposalId);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot apply');
        });
    });

    describe('Catalog Multi-Item Loop (Step 2)', () => {
        // Mock the draftCatalogRepository for these tests
        beforeEach(() => {
            jest.mock('./draftCatalog.repository', () => ({
                draftCatalogRepository: {
                    addItems: jest.fn().mockResolvedValue(1),
                    getAll: jest.fn().mockResolvedValue([]),
                    getCount: jest.fn().mockResolvedValue(0),
                    clearAll: jest.fn().mockResolvedValue(undefined),
                },
            }));
        });

        it('should parse items from text and accumulate', async () => {
            const thread = createThread({
                step: 'catalog_required',
                businessId,
                draftCatalogCount: 0
            });
            const message: ThreadMessage = {
                id: 'm_catalog_1',
                text: 'Burger €12',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            // Should contain "Added" and mention the item
            expect(response).toContain('Added');
            expect(response).toContain('Burger');
            // Should update thread state with draftCatalogCount
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({
                    draftCatalogCount: expect.any(Number)
                })
            }));
        });

        it('should return error when DONE with zero items', async () => {
            const thread = createThread({
                step: 'catalog_required',
                businessId,
                draftCatalogCount: 0
            });
            const message: ThreadMessage = {
                id: 'm_done_empty',
                text: 'DONE',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain("haven't added any items");
        });

        it('should handle SKIP and advance to availability step', async () => {
            const thread = createThread({
                step: 'catalog_required',
                businessId,
                draftCatalogCount: 0
            });
            const message: ThreadMessage = {
                id: 'm_skip',
                text: 'SKIP',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Skipping catalog');
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({
                    step: 'availability_required'
                })
            }));
        });

        it('should return parse error for garbage text', async () => {
            const thread = createThread({
                step: 'catalog_required',
                businessId,
                draftCatalogCount: 0
            });
            const message: ThreadMessage = {
                id: 'm_garbage',
                text: 'Hello how are you',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain("couldn't parse any items");
        });

        it('should handle media as draft item with needsReview', async () => {
            const thread = createThread({
                step: 'catalog_required',
                businessId,
                draftCatalogCount: 0
            });
            const message: ThreadMessage = {
                id: 'm_media',
                text: '',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
                mediaUrls: ['https://example.com/menu.jpg'],
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Added');
            expect(response).toContain('Menu photo');
        });
    });

    describe('Availability Mode Selection (Step 3)', () => {
        it('should present mode options when no selection made', async () => {
            const thread = createThread({
                step: 'availability_required',
                businessId
            });
            const message: ThreadMessage = {
                id: 'm_avail_prompt',
                text: 'hi',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Always Open');
            expect(response).toContain('Request Based');
            expect(response).toContain('Scheduled');
        });

        it('should create proposal when user selects mode by number', async () => {
            const thread = createThread({
                step: 'availability_required',
                businessId
            });
            const message: ThreadMessage = {
                id: 'm_avail_select',
                text: '2',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Proposal');
            expect(response).toContain('Request Based');
            // Verify thread pointer updated
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({
                    pendingProposalId: expect.any(String)
                })
            }));
        });

        it('should create proposal when user selects mode by name', async () => {
            const thread = createThread({
                step: 'availability_required',
                businessId
            });
            const message: ThreadMessage = {
                id: 'm_avail_name',
                text: 'always open please',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Proposal');
            expect(response).toContain('Always Open');
        });
    });

    describe('Review and Publish (Step 4)', () => {
        it('should show go-live summary with checklist', async () => {
            const thread = createThread({
                step: 'review_and_publish',
                businessId
            });
            const message: ThreadMessage = {
                id: 'm_review',
                text: 'ready',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Ready to Go Live');
            expect(response).toContain('Profile configured');
            expect(response).toContain('Catalog added');
            expect(response).toContain('Availability set');
        });

        it('should advance to live_ops on YES approval', async () => {
            // Setup proposal
            const proposalId = 'prop_golive';
            const proposal = {
                id: proposalId,
                kind: 'business_profile_patch',
                status: 'proposed',
                patch: { status: 'active' },
                threadId
            };
            firestore._store.set(`businesses/${businessId}/proposals/${proposalId}`, proposal);

            const thread = createThread({
                step: 'review_and_publish',
                businessId,
                pendingProposalId: proposalId
            });
            const message: ThreadMessage = {
                id: 'm_yes_golive',
                text: 'YES',
                role: 'user',
                createdAt: {} as Timestamp,
                actorId: 'user_123',
                channel: 'whatsapp',
                direction: 'inbound',
                threadId: thread.id,
            };

            const response = await opsService.processOpsMessage(thread, message);

            expect(response).toContain('Approved');
            // Check business doc updated
            const businessDoc = firestore._store.get(`businesses/${businessId}`);
            expect(businessDoc.status).toBe('active');
            // Check step advanced
            expect(updateThreadState).toHaveBeenCalledWith(threadId, expect.objectContaining({
                onboardingState: expect.objectContaining({ step: 'live_ops' })
            }));
        });
    });
});
