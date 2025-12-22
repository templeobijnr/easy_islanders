/**
 * WhatsApp Router
 * 
 * Deterministically routes inbound WhatsApp messages to exactly one handler:
 * 1. Consumer → Merve (general agent)
 * 2. Business ops → Business agent/ops
 * 3. Driver → Dispatch handler
 * 
 * Authoritative lookup: actors/{phoneE164} (future)
 * Fallback: taxi_drivers, businesses collections (legacy)
 */

import { db } from '../../../config/firebase';

// ============================================
// TYPES
// ============================================

export type ActorType = 'consumer' | 'business_owner' | 'business_staff' | 'driver';

export interface Actor {
    id: string;               // Document ID (phoneE164 or generated)
    phoneE164: string;
    type: ActorType;
    businessId?: string;      // Required for business_owner/staff
    name?: string;
}

export type RouteDecision =
    | { route: 'consumer'; actorId: string; threadType: 'general' }
    | { route: 'business_ops'; actorId: string; businessId: string; threadType: 'business_ops' }
    | { route: 'driver'; actorId: string; businessId?: string; threadType: 'dispatch' };

export interface InboundPayload {
    fromE164: string;
    text: string;
    mediaUrls?: string[];
    location?: { lat: number; lng: number };
}

// ============================================
// ACTOR RESOLUTION
// ============================================

/**
 * Resolve actor by phone number.
 * 
 * Resolution order:
 * 1. actors/{phoneE164} (authoritative, future)
 * 2. taxi_drivers collection (legacy fallback)
 * 3. businesses collection (legacy fallback)
 * 4. null (unknown → will default to consumer)
 */
export async function resolveActorByPhone(phoneE164: string): Promise<Actor | null> {
    const cleanPhone = phoneE164.replace(/\+/g, '');

    // 1. Check authoritative actors collection (future-proof)
    try {
        const actorDoc = await db.collection('actors').doc(cleanPhone).get();
        if (actorDoc.exists) {
            const data = actorDoc.data()!;
            return {
                id: actorDoc.id,
                phoneE164: data.phoneE164 || phoneE164,
                type: data.type || 'consumer',
                businessId: data.businessId,
                name: data.name,
            };
        }
    } catch {
        // Collection may not exist yet, continue to fallbacks
    }

    // 2. Check taxi_drivers collection (legacy)
    const driverQuery = await db.collection('taxi_drivers')
        .where('phone', '==', phoneE164)
        .limit(1)
        .get();

    if (!driverQuery.empty) {
        const driverDoc = driverQuery.docs[0];
        const driverData = driverDoc.data();
        return {
            id: driverDoc.id,
            phoneE164,
            type: 'driver',
            businessId: driverData.businessId,
            name: driverData.name,
        };
    }

    // 3. Check businesses collection (legacy) - must have matching phone
    const businessQuery = await db.collection('businesses')
        .where('phone', '==', phoneE164)
        .limit(1)
        .get();

    if (!businessQuery.empty) {
        const bizDoc = businessQuery.docs[0];
        const bizData = bizDoc.data();
        return {
            id: bizDoc.id,
            phoneE164,
            type: 'business_owner',
            businessId: bizDoc.id,  // businessId is the document ID
            name: bizData.name,
        };
    }

    // 4. Unknown actor
    return null;
}

// ============================================
// ROUTING
// ============================================

/**
 * Route an inbound WhatsApp message to the appropriate handler.
 * 
 * Returns a deterministic RouteDecision that includes all required context
 * for downstream handlers.
 * 
 * Rule: business_ops route ONLY returned if businessId is resolved.
 */
export async function routeInbound(payload: InboundPayload): Promise<RouteDecision> {
    const { fromE164 } = payload;
    const cleanPhone = fromE164.replace(/\+/g, '');

    // Resolve actor from phone
    const actor = await resolveActorByPhone(fromE164);

    // No actor found → consumer (default)
    if (!actor) {
        return {
            route: 'consumer',
            actorId: `wa:${cleanPhone}`,
            threadType: 'general',
        };
    }

    // Driver → dispatch
    if (actor.type === 'driver') {
        return {
            route: 'driver',
            actorId: actor.id,
            businessId: actor.businessId,
            threadType: 'dispatch',
        };
    }

    // Business owner/staff → business_ops (only if businessId is resolved)
    if ((actor.type === 'business_owner' || actor.type === 'business_staff') && actor.businessId) {
        return {
            route: 'business_ops',
            actorId: actor.id,
            businessId: actor.businessId,
            threadType: 'business_ops',
        };
    }

    // Consumer (explicit or fallback when business has no businessId)
    return {
        route: 'consumer',
        actorId: actor.id || `wa:${cleanPhone}`,
        threadType: 'general',
    };
}
