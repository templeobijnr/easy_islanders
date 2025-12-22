import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import { analyzeChatTurn } from "../services/ai/profiler";
import { upsertUserIntelligence } from "../services/typesense.service";
import { UserIntelligence } from "../types/user";

// Background listener: analyze user messages and update intelligence graph
export const onMessageAnalyze = onDocumentCreated(
    {
        document: "chatSessions/{convId}/messages/{msgId}",
        database: "easy-db",
        region: "europe-west1"
    },
    async (event) => {
        if (!process.env.GEMINI_API_KEY) {
            logger.info('[onMessageAnalyze] GEMINI_API_KEY not set; skipping profiling');
            return;
        }

        const data = event.data?.data();
        if (!data) return;
        if (data.role && data.role !== 'user') return;
        const uid = data.userId || data.uid;
        const message = data.text || data.message || data.content;
        if (!uid || !message) return;

        try {
            logger.info(`[onMessageAnalyze] Profiling user message`, {
                uid,
                convId: event.params.convId,
                msgId: event.params.msgId,
                snippet: typeof message === 'string' ? message.substring(0, 120) : ''
            });
            const intelRef = db.collection('users').doc(uid).collection('system').doc('intelligence');
            const snap = await intelRef.get();
            const currentGraph = (snap.data() as UserIntelligence) || { attributes: {}, segments: [], missingData: [] };

            const updated = await analyzeChatTurn(uid, message, currentGraph);
            await intelRef.set(updated, { merge: true });
            logger.info(`🧠 Updated intelligence for user ${uid}`);
        } catch (err) {
            logger.error('Profiler failed', err);
        }
    }
);

// Sync intelligence to Typesense (debounced via Firestore trigger)
export const onIntelligenceSync = onDocumentWritten(
    {
        document: "users/{uid}/system/intelligence",
        database: "easy-db",
        region: "europe-west1"
    },
    async (event) => {
        if (!process.env.TYPESENSE_API_KEY) {
            logger.info('[onIntelligenceSync] TYPESENSE_API_KEY not set; skipping Typesense sync');
            return;
        }

        const uid = event.params.uid;
        const data = event.data?.after.data() as UserIntelligence;
        if (!data) return;
        try {
            logger.info(`[onIntelligenceSync] Syncing user intelligence to Typesense`, { uid });
            await upsertUserIntelligence(uid, data);
            logger.info(`🔄 Synced intelligence for user ${uid} to Typesense`);
        } catch (err) {
            logger.error('Failed to sync intelligence to Typesense', err);
        }
    }
);
