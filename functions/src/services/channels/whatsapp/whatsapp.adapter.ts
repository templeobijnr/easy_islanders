export type NormalizedInboundWhatsAppMessage = {
    channel: 'whatsapp';
    provider: 'twilio';
    fromE164: string;
    toE164?: string | null;
    text: string;
    mediaUrls: string[];
    messageId?: string | null;
    receivedAt: Date;
    location?: { lat: number; lng: number; address?: string | null; label?: string | null };
};

/**
 * Normalize Twilio WhatsApp webhook payloads into a stable internal message format.
 * Keeps controllers thin and makes WhatsApp routing reusable across entrypoints.
 */
export function normalizeTwilioWhatsAppPayload(payload: any): NormalizedInboundWhatsAppMessage {
    const fromRaw = payload?.From;
    const bodyRaw = payload?.Body;

    if (!fromRaw) {
        throw new Error('Missing From');
    }

    const fromE164 = String(fromRaw).replace(/^whatsapp:/, '');
    const toE164 = payload?.To ? String(payload.To).replace(/^whatsapp:/, '') : null;
    const text = bodyRaw ? String(bodyRaw) : '';
    const messageId = payload?.MessageSid ? String(payload.MessageSid) : null;

    const numMedia = Number.parseInt(String(payload?.NumMedia ?? '0'), 10);
    const mediaUrls: string[] = [];
    const boundedNumMedia = Number.isFinite(numMedia) ? Math.min(Math.max(numMedia, 0), 5) : 0;
    if (boundedNumMedia > 0) {
        for (let i = 0; i < boundedNumMedia; i++) {
            const url = payload?.[`MediaUrl${i}`];
            if (url) mediaUrls.push(String(url));
        }
    }

    const lat = payload?.Latitude != null ? Number.parseFloat(String(payload.Latitude)) : NaN;
    const lng = payload?.Longitude != null ? Number.parseFloat(String(payload.Longitude)) : NaN;
    const location =
        Number.isFinite(lat) && Number.isFinite(lng)
            ? {
                  lat,
                  lng,
                  address: payload?.Address ? String(payload.Address) : null,
                  label: payload?.Label ? String(payload.Label) : null,
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
