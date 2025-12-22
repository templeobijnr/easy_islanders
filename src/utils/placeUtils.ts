import { FirestorePlace as Place } from '../types/catalog';

// Our internal categories
type PlaceCategory = Place['category'];

/**
 * Maps Google Places API 'types' to our internal PlaceCategory.
 * Google types are an array of strings. We look for high-priority matches first.
 */
export const mapGoogleTypeToCategory = (googleTypes: string[] = []): PlaceCategory => {
    const typesSet = new Set(googleTypes);

    // 1. Nightlife (Specific)
    if (typesSet.has('night_club') || typesSet.has('casino') || typesSet.has('bar') || typesSet.has('pub')) {
        return 'nightlife';
    }

    // 2. Cafe (Specific)
    if (typesSet.has('cafe') || typesSet.has('bakery') || typesSet.has('coffee_shop')) {
        return 'cafe';
    }

    // 3. Food (General)
    if (typesSet.has('restaurant') || typesSet.has('meal_takeaway') || typesSet.has('meal_delivery') || typesSet.has('food')) {
        return 'food';
    }

    // 4. Sights / Tourism
    if (
        typesSet.has('tourist_attraction') ||
        typesSet.has('museum') ||
        typesSet.has('park') ||
        typesSet.has('church') ||
        typesSet.has('place_of_worship') ||
        typesSet.has('point_of_interest') && typesSet.has('establishment') // Generic fallback often used for sights
    ) {
        // Refine 'point_of_interest': if it's the ONLY thing, it might be anything, but usually sights
        // Let's check for shopping to be safe
        if (!typesSet.has('store') && !typesSet.has('shopping_mall')) {
            return 'sight';
        }
    }

    // 5. Shopping
    if (
        typesSet.has('shopping_mall') ||
        typesSet.has('clothing_store') ||
        typesSet.has('supermarket') ||
        typesSet.has('store') ||
        typesSet.has('grocery_or_supermarket')
    ) {
        return 'shopping';
    }

    // 6. Services
    if (
        typesSet.has('bank') ||
        typesSet.has('atm') ||
        typesSet.has('pharmacy') ||
        typesSet.has('hospital') ||
        typesSet.has('post_office') ||
        typesSet.has('gas_station') ||
        typesSet.has('lodging') // Hotels are services/stays
    ) {
        return 'service';
    }

    return 'other';
};

/**
 * Transforms a raw Google Place Result into our Place interface
 */
export const transformGooglePlace = (googlePlace: any): Place => {
    const category = mapGoogleTypeToCategory(googlePlace.types);

    // Extract main photo if available
    let images: string[] = [];
    if (googlePlace.photos && googlePlace.photos.length > 0) {
        // Note: In a real app, you'd call getUrl() on the photo object with max width
        // For raw data object, it might be a reference string
        images = googlePlace.photos.map((p: any) => p.getUrl ? p.getUrl({ maxWidth: 400 }) : '');
    }

    return {
        id: googlePlace.place_id,
        title: googlePlace.name,
        description: googlePlace.vicinity || googlePlace.formatted_address,
        category,
        coordinates: {
            lat: googlePlace.geometry?.location?.lat() || 0,
            lng: googlePlace.geometry?.location?.lng() || 0
        },
        images,
        rating: googlePlace.rating,
        address: googlePlace.vicinity,
        tags: googlePlace.types
    };
};
