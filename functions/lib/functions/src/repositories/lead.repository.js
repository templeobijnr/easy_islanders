"use strict";
/**
 * Lead Repository
 * Handles lead CRUD operations.
 *
 * Collection: businesses/{businessId}/leads/{leadId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadRepository = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const log_1 = require("../utils/log");
/**
 * Get the leads collection path for a business.
 */
const getLeadsPath = (businessId) => `businesses/${businessId}/leads`;
exports.leadRepository = {
    /**
     * Create a new lead.
     */
    create: async (businessId, lead) => {
        const leadsRef = firebase_1.db.collection(getLeadsPath(businessId));
        const docRef = leadsRef.doc();
        const newLead = Object.assign(Object.assign({}, lead), { businessId, status: 'new', createdAt: firestore_1.FieldValue.serverTimestamp() });
        await docRef.set(newLead);
        log_1.log.info('[LeadRepo] Created lead', { leadId: docRef.id });
        return Object.assign(Object.assign({ id: docRef.id }, newLead), { createdAt: new Date() // Will be resolved by Firestore
         });
    },
    /**
     * Get a lead by ID.
     */
    getById: async (businessId, leadId) => {
        const doc = await firebase_1.db.collection(getLeadsPath(businessId)).doc(leadId).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * List leads for a business.
     */
    list: async (businessId, options = {}) => {
        let query = firebase_1.db.collection(getLeadsPath(businessId))
            .orderBy('createdAt', 'desc');
        if (options.status) {
            query = query.where('status', '==', options.status);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update lead status.
     */
    updateStatus: async (businessId, leadId, status) => {
        await firebase_1.db.collection(getLeadsPath(businessId)).doc(leadId).update({
            status,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
    },
    /**
     * Count leads by status.
     */
    countByStatus: async (businessId, status) => {
        const snapshot = await firebase_1.db.collection(getLeadsPath(businessId))
            .where('status', '==', status)
            .count()
            .get();
        return snapshot.data().count;
    }
};
//# sourceMappingURL=lead.repository.js.map