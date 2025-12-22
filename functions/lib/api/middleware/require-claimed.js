"use strict";
/**
 * Require Claimed Middleware
 *
 * Blocks access to owner endpoints if the business is not yet claimed.
 * Must be used AFTER requireOwner middleware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireClaimed = requireClaimed;
const firebase_1 = require("../../config/firebase");
const log_1 = require("../../utils/log");
/**
 * Require that the business is claimed before allowing access.
 * Rejects with 403 if business is unclaimed or pending.
 */
async function requireClaimed(req, res, next) {
    const ctx = req.tenantContext;
    if (!(ctx === null || ctx === void 0 ? void 0 : ctx.businessId)) {
        res.status(403).json({
            error: 'No business context available',
            code: 'NO_CONTEXT'
        });
        return;
    }
    try {
        const businessDoc = await firebase_1.db.collection('businesses').doc(ctx.businessId).get();
        if (!businessDoc.exists) {
            res.status(404).json({
                error: 'Business not found',
                code: 'BUSINESS_NOT_FOUND'
            });
            return;
        }
        const business = businessDoc.data();
        if (business.claimStatus !== 'claimed') {
            res.status(403).json({
                error: 'Business must be claimed to access this resource',
                code: 'NOT_CLAIMED',
                claimStatus: business.claimStatus
            });
            return;
        }
        if (business.claimedByUid && business.claimedByUid !== ctx.uid) {
            res.status(403).json({
                error: 'Business is claimed by another account',
                code: 'NOT_BUSINESS_OWNER'
            });
            return;
        }
        // Attach business to request for downstream use
        req.business = business;
        next();
    }
    catch (error) {
        log_1.log.error('[RequireClaimed] Error checking business', error);
        res.status(500).json({ error: 'Failed to verify business status' });
    }
}
//# sourceMappingURL=require-claimed.js.map