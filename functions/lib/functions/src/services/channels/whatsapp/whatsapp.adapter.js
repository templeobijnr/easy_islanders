"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTwilioWhatsAppPayload = normalizeTwilioWhatsAppPayload;
/**
 * Normalize Twilio WhatsApp webhook payloads into a stable internal message format.
 * Keeps controllers thin and makes WhatsApp routing reusable across entrypoints.
 */
function normalizeTwilioWhatsAppPayload(payload) {
    var _a;
    const fromRaw = payload === null || payload === void 0 ? void 0 : payload.From;
    const bodyRaw = payload === null || payload === void 0 ? void 0 : payload.Body;
    if (!fromRaw) {
        throw new Error('Missing From');
    }
    const fromE164 = String(fromRaw).replace(/^whatsapp:/, '');
    const toE164 = (payload === null || payload === void 0 ? void 0 : payload.To) ? String(payload.To).replace(/^whatsapp:/, '') : null;
    const text = bodyRaw ? String(bodyRaw) : '';
    const messageId = (payload === null || payload === void 0 ? void 0 : payload.MessageSid) ? String(payload.MessageSid) : null;
    const numMedia = Number.parseInt(String((_a = payload === null || payload === void 0 ? void 0 : payload.NumMedia) !== null && _a !== void 0 ? _a : '0'), 10);
    const mediaUrls = [];
    const boundedNumMedia = Number.isFinite(numMedia) ? Math.min(Math.max(numMedia, 0), 5) : 0;
    if (boundedNumMedia > 0) {
        for (let i = 0; i < boundedNumMedia; i++) {
            const url = payload === null || payload === void 0 ? void 0 : payload[`MediaUrl${i}`];
            if (url)
                mediaUrls.push(String(url));
        }
    }
    const lat = (payload === null || payload === void 0 ? void 0 : payload.Latitude) != null ? Number.parseFloat(String(payload.Latitude)) : NaN;
    const lng = (payload === null || payload === void 0 ? void 0 : payload.Longitude) != null ? Number.parseFloat(String(payload.Longitude)) : NaN;
    const location = Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            lat,
            lng,
            address: (payload === null || payload === void 0 ? void 0 : payload.Address) ? String(payload.Address) : null,
            label: (payload === null || payload === void 0 ? void 0 : payload.Label) ? String(payload.Label) : null,
        }
        : undefined;
    return {
        channel: 'whatsapp',
        provider: 'twilio',
        fromE164,
        toE164,
        text,
        mediaUrls,
        messageId,
        receivedAt: new Date(),
        location,
    };
}
//# sourceMappingURL=whatsapp.adapter.js.map