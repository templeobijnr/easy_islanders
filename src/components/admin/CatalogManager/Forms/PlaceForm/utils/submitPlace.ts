/**
 * submitPlace - Handle PlaceForm submission to Firestore
 */
import {
    UnifiedListing,
    DEFAULT_BOOKING_OPTIONS,
    DEFAULT_LISTING_ACTIONS,
    CATEGORY_BOOKING_PRESETS,
} from '@/types/UnifiedListing';
import { UnifiedListingsService } from '@/services/unifiedListingsService';
import type { PlaceFormState } from '../types';

interface SubmitPlaceResult {
    success?: boolean;
    error?: string;
}

export async function submitPlace(
    form: PlaceFormState,
    initialValue: UnifiedListing | null | undefined
): Promise<SubmitPlaceResult> {
    if (!form.title.trim()) {
        return { error: 'Title is required' };
    }

    // Merve validation
    const enabledActions = (form.merveConfig.actions || []).filter((a) => a.enabled);
    const globalWhatsApp = form.merveConfig.whatsappE164?.trim() || '';
    const missingTargets = enabledActions.filter(
        (a) =>
            a.dispatch?.channel === 'whatsapp' &&
            !(a.dispatch?.toE164?.trim() || globalWhatsApp)
    );
    if (form.merveConfig.enabled && missingTargets.length > 0) {
        return {
            error:
                'Merve Integration: each enabled action needs a WhatsApp target (either Default WhatsApp or a per-action override).',
        };
    }

    try {
        // Build merve object from MerveConfig
        const merveData = form.merveConfig.enabled
            ? {
                enabled: true,
                actions: (form.merveConfig.actions || []).map((a) => ({
                    ...a,
                    dispatch: {
                        ...a.dispatch,
                        toE164: a.dispatch?.toE164?.trim() || undefined,
                        template: a.dispatch?.template?.trim() || undefined,
                    },
                    tags: a.tags?.map((t) => t.trim()).filter(Boolean) || undefined,
                    notes: a.notes?.trim() || undefined,
                })),
                whatsappE164: form.merveConfig.whatsappE164?.trim() || undefined,
                coverageAreas: form.merveConfig.coverageAreas || [],
                tags: form.merveConfig.tags || [],
                geo: { lat: form.lat, lng: form.lng },
                actionTypesEnabled: enabledActions.map((a) => a.actionType),
            }
            : { enabled: false };

        const listingData: Omit<UnifiedListing, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'place',
            category: form.category,
            subcategory: form.subcategory || undefined,
            title: form.title,
            description: form.description,
            address: form.address,
            lat: form.lat,
            lng: form.lng,
            region: form.region,
            cityId: form.cityId,
            phone: form.phone || undefined,
            email: form.email || undefined,
            website: form.website || undefined,
            images: form.images,
            rating: form.rating || undefined,
            priceLevel: form.priceLevel || undefined,
            displayPrice: form.displayPrice || undefined,
            openingHours: form.openingHours.length > 0 ? form.openingHours : undefined,
            bookingEnabled: form.bookingEnabled,
            bookingOptions: CATEGORY_BOOKING_PRESETS[form.category]
                ? {
                    ...DEFAULT_BOOKING_OPTIONS,
                    ...CATEGORY_BOOKING_PRESETS[form.category],
                }
                : DEFAULT_BOOKING_OPTIONS,
            actions: {
                ...DEFAULT_LISTING_ACTIONS,
                allowCheckIn: form.allowCheckIn,
                allowJoin: form.allowJoin,
                allowWave: form.allowWave,
                allowTaxi: form.allowTaxi,
                allowNavigate: form.allowNavigate,
            } as any,
            googlePlaceId: form.googlePlaceId || undefined,
            showOnMap: form.showOnMap,
            approved: true,
            merve: merveData,
        } as any;

        if (initialValue?.id) {
            await UnifiedListingsService.update(initialValue.id, listingData);
        } else {
            await UnifiedListingsService.create(listingData);
        }

        return { success: true };
    } catch (err: unknown) {
        console.error('Failed to save place:', err);
        return { error: (err as Error).message || 'Failed to save place' };
    }
}
