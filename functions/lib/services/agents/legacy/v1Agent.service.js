"use strict";
/**
 * V1 Agent Service
 * Implements V1 chat agent tool functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlaces = searchPlaces;
exports.searchActivities = searchActivities;
exports.searchHousingListings = searchHousingListings;
exports.createHousingRequest = createHousingRequest;
exports.searchCarRentalListings = searchCarRentalListings;
exports.createCarRentalRequest = createCarRentalRequest;
exports.createServiceRequest = createServiceRequest;
const repositories_1 = require("../../../repositories");
// ============================================================================
// PLACES & DISCOVERY
// ============================================================================
async function searchPlaces(params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        let places;
        if (params.featured) {
            places = await repositories_1.placesRepository.getFeatured(cityId);
        }
        else if (params.category) {
            places = await repositories_1.placesRepository.getByCategory(cityId, params.category);
        }
        else if (params.tags && params.tags.length > 0) {
            places = await repositories_1.placesRepository.getByTags(cityId, params.tags);
        }
        else if (params.areaName) {
            // For area search, we need to get all places and filter client-side
            // since we don't have areaId, only areaName
            const allPlaces = await repositories_1.placesRepository.getByCityId(cityId);
            places = allPlaces.filter(p => { var _a; return (_a = p.areaName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(params.areaName.toLowerCase()); });
        }
        else {
            places = await repositories_1.placesRepository.getByCityId(cityId);
        }
        // Additional filtering
        if (params.areaName && !params.areaName) {
            places = places.filter(p => { var _a; return (_a = p.areaName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(params.areaName.toLowerCase()); });
        }
        return {
            success: true,
            places: places.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                subcategory: p.subcategory,
                areaName: p.areaName,
                address: p.address,
                description: p.descriptionShort || p.descriptionLong,
                tags: p.tags,
                phone: p.phone,
                whatsapp: p.whatsapp,
                instagram: p.instagram,
                priceLevel: p.averagePriceLevel,
                rating: p.ratingAverage,
                actions: p.actions,
                coordinates: p.coordinates
            })),
            count: places.length
        };
    }
    catch (error) {
        console.error('Error searching places:', error);
        return {
            success: false,
            error: 'Failed to search places',
            places: [],
            count: 0
        };
    }
}
async function searchActivities(params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        let activities;
        if (params.placeId) {
            activities = await repositories_1.activitiesRepository.getByPlace(params.placeId);
        }
        else if (params.category) {
            activities = await repositories_1.activitiesRepository.getByCategory(cityId, params.category);
        }
        else if (params.when === 'upcoming' || params.when === 'this_week') {
            activities = await repositories_1.activitiesRepository.getUpcoming(cityId);
        }
        else if (params.when === 'this_weekend') {
            // Get Friday to Sunday
            const friday = new Date();
            friday.setDate(friday.getDate() + (5 - friday.getDay()));
            const sunday = new Date(friday);
            sunday.setDate(sunday.getDate() + 2);
            activities = await repositories_1.activitiesRepository.getByDateRange(cityId, friday.toISOString(), sunday.toISOString());
        }
        else if (params.when === 'today') {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            activities = await repositories_1.activitiesRepository.getByDateRange(cityId, today.toISOString(), tomorrow.toISOString());
        }
        else {
            activities = await repositories_1.activitiesRepository.getUpcoming(cityId);
        }
        return {
            success: true,
            activities: activities.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                category: a.category,
                startsAt: a.startsAt,
                endsAt: a.endsAt,
                price: a.price,
                isFree: a.isFree,
                placeId: a.placeId,
                coordinates: a.coordinates,
                hostName: a.hostName,
                hostContact: a.hostContactWhatsApp,
                bookingType: a.bookingType,
                bookingTarget: a.bookingTarget,
                images: a.images
            })),
            count: activities.length
        };
    }
    catch (error) {
        console.error('Error searching activities:', error);
        return {
            success: false,
            error: 'Failed to search activities',
            activities: [],
            count: 0
        };
    }
}
// ============================================================================
// HOUSING
// ============================================================================
async function searchHousingListings(params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        const listings = await repositories_1.listingsRepository.searchHousing(cityId, {
            housingType: params.housingType,
            bedrooms: params.bedrooms,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            areaName: params.areaName,
            furnished: params.furnished
        });
        return {
            success: true,
            listings: listings.map(l => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return ({
                    id: l.id,
                    title: l.title,
                    description: l.description,
                    price: l.price,
                    priceUnit: l.priceUnit,
                    type: (_a = l.housing) === null || _a === void 0 ? void 0 : _a.type,
                    bedrooms: (_b = l.housing) === null || _b === void 0 ? void 0 : _b.bedrooms,
                    bathrooms: (_c = l.housing) === null || _c === void 0 ? void 0 : _c.bathrooms,
                    furnished: (_d = l.housing) === null || _d === void 0 ? void 0 : _d.furnished,
                    areaName: (_e = l.housing) === null || _e === void 0 ? void 0 : _e.areaName,
                    sizeSqm: (_f = l.housing) === null || _f === void 0 ? void 0 : _f.sizeSqm,
                    floor: (_g = l.housing) === null || _g === void 0 ? void 0 : _g.floor,
                    minStayMonths: (_h = l.housing) === null || _h === void 0 ? void 0 : _h.minStayMonths,
                    images: l.images,
                    tags: l.tags,
                    bookingType: l.bookingType,
                    bookingTarget: l.bookingTarget,
                    coordinates: l.coordinates
                });
            }),
            count: listings.length
        };
    }
    catch (error) {
        console.error('Error searching housing:', error);
        return {
            success: false,
            error: 'Failed to search housing listings',
            listings: [],
            count: 0
        };
    }
}
async function createHousingRequest(userId, params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        const request = await repositories_1.requestsRepository.create({
            userId,
            cityId,
            category: 'HOUSING',
            title: `Housing Request: ${params.bedrooms || ''} bedroom ${params.areaName || ''}`.trim(),
            description: params.description,
            meta: {
                beds: params.bedrooms,
                budgetMin: params.budgetMin,
                budgetMax: params.budgetMax,
                areaName: params.areaName,
                fromDate: params.moveInDate,
                intent: 'rent',
                notes: params.notes
            },
            status: 'new',
            contactPhone: params.contactPhone,
            preferredContact: params.contactPhone ? 'phone' : 'in_app'
        });
        return {
            success: true,
            requestId: request.id,
            message: 'Housing request created! Our agents will contact you within 24 hours with suitable options.',
            request: {
                id: request.id,
                title: request.title,
                description: request.description,
                status: request.status
            }
        };
    }
    catch (error) {
        console.error('Error creating housing request:', error);
        return {
            success: false,
            error: 'Failed to create housing request'
        };
    }
}
// ============================================================================
// CAR RENTAL
// ============================================================================
async function searchCarRentalListings(params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        const listings = await repositories_1.listingsRepository.searchCarRentals(cityId, {
            carType: params.carType,
            transmission: params.transmission,
            minSeats: params.minSeats,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice
        });
        return {
            success: true,
            listings: listings.map(l => {
                var _a, _b, _c, _d;
                return ({
                    id: l.id,
                    title: l.title,
                    description: l.description,
                    price: l.price,
                    priceUnit: l.priceUnit,
                    carType: (_a = l.carRental) === null || _a === void 0 ? void 0 : _a.carType,
                    transmission: (_b = l.carRental) === null || _b === void 0 ? void 0 : _b.transmission,
                    seats: (_c = l.carRental) === null || _c === void 0 ? void 0 : _c.seats,
                    mileageLimit: (_d = l.carRental) === null || _d === void 0 ? void 0 : _d.mileageLimitPerDay,
                    images: l.images,
                    tags: l.tags,
                    bookingType: l.bookingType,
                    bookingTarget: l.bookingTarget
                });
            }),
            count: listings.length
        };
    }
    catch (error) {
        console.error('Error searching car rentals:', error);
        return {
            success: false,
            error: 'Failed to search car rental listings',
            listings: [],
            count: 0
        };
    }
}
async function createCarRentalRequest(userId, params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        const request = await repositories_1.requestsRepository.create({
            userId,
            cityId,
            category: 'CAR_RENTAL',
            title: `Car Rental: ${params.carType || 'Any'} for ${params.rentalDays || ''} days`.trim(),
            description: params.description,
            meta: {
                carType: params.carType,
                rentalDays: params.rentalDays,
                fromDate: params.fromDate,
                toDate: params.toDate,
                notes: params.notes
            },
            status: 'new',
            contactPhone: params.contactPhone,
            preferredContact: params.contactPhone ? 'phone' : 'in_app'
        });
        return {
            success: true,
            requestId: request.id,
            message: 'Car rental request created! We\'ll send you available options shortly.',
            request: {
                id: request.id,
                title: request.title,
                description: request.description,
                status: request.status
            }
        };
    }
    catch (error) {
        console.error('Error creating car rental request:', error);
        return {
            success: false,
            error: 'Failed to create car rental request'
        };
    }
}
// ============================================================================
// SERVICES & SUPPLIES
// ============================================================================
async function createServiceRequest(userId, params) {
    const cityId = 'north-cyprus'; // TODO: Get from user profile
    try {
        const request = await repositories_1.requestsRepository.create({
            userId,
            cityId,
            category: params.category,
            title: params.title,
            description: params.description,
            meta: {
                when: params.when,
                areaName: params.location,
                quantity: params.quantity,
                notes: params.notes
            },
            status: 'new',
            contactPhone: params.contactPhone,
            preferredContact: params.contactPhone ? 'phone' : 'in_app'
        });
        return {
            success: true,
            requestId: request.id,
            message: 'Service request created! We\'ll arrange this for you and get back to you soon.',
            request: {
                id: request.id,
                title: request.title,
                description: request.description,
                status: request.status,
                category: request.category
            }
        };
    }
    catch (error) {
        console.error('Error creating service request:', error);
        return {
            success: false,
            error: 'Failed to create service request'
        };
    }
}
//# sourceMappingURL=v1Agent.service.js.map