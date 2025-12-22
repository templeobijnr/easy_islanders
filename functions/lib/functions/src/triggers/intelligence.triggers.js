"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onIntelligenceSync = exports.onMessageAnalyze = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const profiler_1 = require("../services/ai/profiler");
const typesense_service_1 = require("../services/typesense.service");
// Background listener: analyze user messages and update intelligence graph
exports.onMessageAnalyze = (0, firestore_1.onDocumentCreated)({
    document: "chatSessions/{convId}/messages/{msgId}",
    database: "easy-db",
    region: "europe-west1"
}, async (event) => {
    var _a;
    if (!process.env.GEMINI_API_KEY) {
        logger.info('[onMessageAnalyze] GEMINI_API_KEY not set; skipping profiling');
        return;
    }
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    if (data.role && data.role !== 'user')
        return;
    const uid = data.userId || data.uid;
    const message = data.text || data.message || data.content;
    if (!uid || !message)
        return;
    try {
        logger.info(`[onMessageAnalyze] Profiling user message`, {
            uid,
            convId: event.params.convId,
            msgId: event.params.msgId,
            snippet: typeof message === 'string' ? message.substring(0, 120) : ''
        });
        const intelRef = firebase_1.db.collection('users').doc(uid).collection('system').doc('intelligence');
        const snap = await intelRef.get();
        const currentGraph = snap.data() || { attributes: {}, segments: [], missingData: [] };
        const updated = await (0, profiler_1.analyzeChatTurn)(uid, message, currentGraph);
        await intelRef.set(updated, { merge: true });
        logger.info(`🧠 Updated intelligence for user ${uid}`);
    }
    catch (err) {
        logger.error('Profiler failed', err);
    }
});
// Sync intelligence to Typesense (debounced via Firestore trigger)
exports.onIntelligenceSync = (0, firestore_1.onDocumentWritten)({
    document: "users/{uid}/system/intelligence",
    database: "easy-db",
    region: "europe-west1"
}, async (event) => {
    var _a;
    if (!process.env.TYPESENSE_API_KEY) {
        logger.info('[onIntelligenceSync] TYPESENSE_API_KEY not set; skipping Typesense sync');
        return;
    }
    const uid = event.params.uid;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    if (!data)
        return;
    try {
        logger.info(`[onIntelligenceSync] Syncing user intelligence to Typesense`, { uid });
        await (0, typesense_service_1.upsertUserIntelligence)(uid, data);
        logger.info(`🔄 Synced intelligence for user ${uid} to Typesense`);
    }
    catch (err) {
        logger.error('Failed to sync intelligence to Typesense', err);
    }
});
//# sourceMappingURL=intelligence.triggers.js.map