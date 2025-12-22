/**
 * Lead Repository
 * Handles lead CRUD operations.
 * 
 * Collection: businesses/{businessId}/leads/{leadId}
 */

import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { Lead, LeadStatus } from '../types/lead';
import { log } from '../utils/log';

/**
 * Get the leads collection path for a business.
 */
const getLeadsPath = (businessId: string) => `businesses/${businessId}/leads`;

export const leadRepository = {
    /**
     * Create a new lead.
     */
    create: async (
        businessId: string,
        lead: Omit<Lead, 'id' | 'businessId' | 'createdAt' | 'status'>
    ): Promise<Lead> => {
        const leadsRef = db.collection(getLeadsPath(businessId));
        const docRef = leadsRef.doc();

        const newLead = {
            ...lead,
            businessId,
            status: 'new' as LeadStatus,
            createdAt: FieldValue.serverTimestamp()
        };

        await docRef.set(newLead);

        log.info('[LeadRepo] Created lead', { leadId: docRef.id });

        return {
            id: docRef.id,
            ...newLead,
            createdAt: new Date() as any // Will be resolved by Firestore
        } as Lead;
    },

    /**
     * Get a lead by ID.
     */
    getById: async (businessId: string, leadId: string): Promise<Lead | null> => {
        const doc = await db.collection(getLeadsPath(businessId)).doc(leadId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Lead;
    },

    /**
     * List leads for a business.
     */
    list: async (
        businessId: string,
        options: {
            status?: LeadStatus;
            limit?: number;
        } = {}
    ): Promise<Lead[]> => {
        let query = db.collection(getLeadsPath(businessId))
            .orderBy('createdAt', 'desc');

        if (options.status) {
            query = query.where('status', '==', options.status) as FirebaseFirestore.Query;
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Lead[];
    },

    /**
     * Update lead status.
     */
    updateStatus: async (
        businessId: string,
        leadId: string,
        status: LeadStatus
    ): Promise<void> => {
        await db.collection(getLeadsPath(businessId)).doc(leadId).update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });
    },

    /**
     * Count leads by status.
     */
    countByStatus: async (
        businessId: string,
        status: LeadStatus
    ): Promise<number> => {
        const snapshot = await db.collection(getLeadsPath(businessId))
            .where('status', '==', status)
            .count()
            .get();

        return snapshot.data().count;
    }
};
