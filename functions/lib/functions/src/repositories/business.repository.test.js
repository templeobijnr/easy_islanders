"use strict";
/**
 * Business Repository Tests
 * Tests for business claiming transactions and CRUD operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const business_repository_1 = require("./business.repository");
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
// Mock Firestore
jest.mock('../config/firebase', () => ({
    db: {
        collection: jest.fn(),
        runTransaction: jest.fn()
    }
}));
describe('Business Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getById', () => {
        it('should return business when found', async () => {
            const mockBusiness = {
                displayName: 'Test Business',
                businessPhoneE164: '+1234567890',
                claimStatus: 'unclaimed',
                status: 'active'
            };
            const mockDoc = {
                exists: true,
                id: 'business123',
                data: () => mockBusiness
            };
            const mockDocRef = {
                get: jest.fn().mockResolvedValue(mockDoc)
            };
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDocRef)
            });
            const result = await business_repository_1.businessRepository.getById('business123');
            expect(result).toEqual(Object.assign({ id: 'business123' }, mockBusiness));
            expect(firebase_1.db.collection).toHaveBeenCalledWith('businesses');
        });
        it('should return null when not found', async () => {
            const mockDoc = {
                exists: false
            };
            const mockDocRef = {
                get: jest.fn().mockResolvedValue(mockDoc)
            };
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDocRef)
            });
            const result = await business_repository_1.businessRepository.getById('nonexistent');
            expect(result).toBeNull();
        });
    });
    describe('getByOwnerUid', () => {
        it('should return business owned by user', async () => {
            const mockBusiness = {
                displayName: 'Owned Business',
                claimedByUid: 'user123',
                status: 'active'
            };
            const mockSnapshot = {
                empty: false,
                docs: [{
                        id: 'business456',
                        data: () => mockBusiness
                    }]
            };
            const mockQuery = {
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue(mockSnapshot)
            };
            firebase_1.db.collection.mockReturnValue(mockQuery);
            const result = await business_repository_1.businessRepository.getByOwnerUid('user123');
            expect(result).toEqual(Object.assign({ id: 'business456' }, mockBusiness));
            expect(mockQuery.where).toHaveBeenCalledWith('claimedByUid', '==', 'user123');
            expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'active');
        });
        it('should return null when user owns no business', async () => {
            const mockSnapshot = {
                empty: true,
                docs: []
            };
            const mockQuery = {
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue(mockSnapshot)
            };
            firebase_1.db.collection.mockReturnValue(mockQuery);
            const result = await business_repository_1.businessRepository.getByOwnerUid('userWithNoBusiness');
            expect(result).toBeNull();
        });
    });
    describe('startClaim', () => {
        it('should successfully start claim for unclaimed business', async () => {
            const mockBusinessData = {
                displayName: 'Unclaimed Business',
                businessPhoneE164: '+1234567890',
                claimStatus: 'unclaimed',
                status: 'active'
            };
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'business789',
                    data: () => mockBusinessData
                }),
                update: jest.fn()
            };
            firebase_1.db.runTransaction.mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({ path: 'businesses/business789' })
            });
            const result = await business_repository_1.businessRepository.startClaim('business789', 'claimingUser');
            expect(result.success).toBe(true);
            expect(result.business).toBeDefined();
            expect(mockTransaction.update).toHaveBeenCalled();
        });
        it('should reject claim for already claimed business', async () => {
            const mockBusinessData = {
                displayName: 'Already Claimed Business',
                claimStatus: 'claimed',
                claimedByUid: 'existingOwner',
                status: 'active'
            };
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'business_claimed',
                    data: () => mockBusinessData
                }),
                update: jest.fn()
            };
            firebase_1.db.runTransaction.mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({ path: 'businesses/business_claimed' })
            });
            const result = await business_repository_1.businessRepository.startClaim('business_claimed', 'newUser');
            expect(result.success).toBe(false);
            expect(result.error).toBe('ALREADY_CLAIMED');
            expect(mockTransaction.update).not.toHaveBeenCalled();
        });
        it('should reject claim for inactive business', async () => {
            const mockBusinessData = {
                displayName: 'Deleted Business',
                claimStatus: 'unclaimed',
                status: 'deleted'
            };
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'deleted_business',
                    data: () => mockBusinessData
                }),
                update: jest.fn()
            };
            firebase_1.db.runTransaction.mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({ path: 'businesses/deleted_business' })
            });
            const result = await business_repository_1.businessRepository.startClaim('deleted_business', 'user');
            expect(result.success).toBe(false);
            expect(result.error).toBe('BUSINESS_INACTIVE');
        });
        it('should reject claim when another user has pending claim', async () => {
            const futureTime = firestore_1.Timestamp.fromMillis(Date.now() + 600000); // 10 minutes from now
            const mockBusinessData = {
                displayName: 'Pending Claim Business',
                claimStatus: 'pending',
                pendingClaimUid: 'otherUser',
                pendingExpiresAt: futureTime,
                status: 'active'
            };
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'pending_business',
                    data: () => mockBusinessData
                }),
                update: jest.fn()
            };
            firebase_1.db.runTransaction.mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({ path: 'businesses/pending_business' })
            });
            const result = await business_repository_1.businessRepository.startClaim('pending_business', 'newUser');
            expect(result.success).toBe(false);
            expect(result.error).toBe('CLAIM_IN_PROGRESS');
        });
        it('should allow claim when pending claim has expired', async () => {
            const pastTime = firestore_1.Timestamp.fromMillis(Date.now() - 600000); // 10 minutes ago
            const mockBusinessData = {
                displayName: 'Expired Pending Business',
                claimStatus: 'pending',
                pendingClaimUid: 'oldUser',
                pendingExpiresAt: pastTime,
                status: 'active'
            };
            const mockTransaction = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'expired_pending',
                    data: () => mockBusinessData
                }),
                update: jest.fn()
            };
            firebase_1.db.runTransaction.mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({ path: 'businesses/expired_pending' })
            });
            const result = await business_repository_1.businessRepository.startClaim('expired_pending', 'newUser');
            expect(result.success).toBe(true);
            expect(mockTransaction.update).toHaveBeenCalled();
        });
    });
    describe('isMember', () => {
        it('should return true for active member', async () => {
            const mockMemberDoc = {
                exists: true,
                data: () => ({ status: 'active', role: 'owner' })
            };
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(mockMemberDoc)
                        })
                    })
                })
            });
            const result = await business_repository_1.businessRepository.isMember('business123', 'user456');
            expect(result).toBe(true);
        });
        it('should return false for non-member', async () => {
            const mockMemberDoc = {
                exists: false
            };
            firebase_1.db.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(mockMemberDoc)
                        })
                    })
                })
            });
            const result = await business_repository_1.businessRepository.isMember('business123', 'nonMember');
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=business.repository.test.js.map