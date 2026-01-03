"use strict";
/**
 * Admin Catalog Repository
 *
 * Read operations for admin-controlled catalogs that power Merve's tools.
 * Collections: restaurants, vendors, service_providers, pharmacies_on_duty, news_cache
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRepository = exports.pharmacyRepository = exports.serviceProviderRepository = exports.vendorRepository = exports.restaurantRepository = void 0;
var firestore_1 = require("firebase-admin/firestore");
var catalog_types_1 = require("../types/catalog.types");
var db = (0, firestore_1.getFirestore)();
// ============================================================================
// RESTAURANTS
// ============================================================================
exports.restaurantRepository = {
    search: function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var ref, snap, results, lower_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ref = db.collection(catalog_types_1.COLLECTIONS.restaurants)
                            .where('active', '==', true);
                        if (query.cuisineTag) {
                            ref = ref.where('cuisineTags', 'array-contains', query.cuisineTag);
                        }
                        if (query.area) {
                            ref = ref.where('deliveryAreas', 'array-contains', query.area);
                        }
                        return [4 /*yield*/, ref.limit(query.limit || 20).get()];
                    case 1:
                        snap = _a.sent();
                        results = snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                        if (query.name) {
                            lower_1 = query.name.toLowerCase();
                            return [2 /*return*/, results.filter(function (r) { return r.name.toLowerCase().includes(lower_1); })];
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.restaurants).doc(id).get()];
                    case 1:
                        doc = _a.sent();
                        return [2 /*return*/, doc.exists ? __assign({ id: doc.id }, doc.data()) : null];
                }
            });
        });
    },
    getMenu: function (restaurantId) {
        return __awaiter(this, void 0, void 0, function () {
            var snap;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.menuItems(restaurantId))
                            .where('active', '==', true)
                            .orderBy('category')
                            .get()];
                    case 1:
                        snap = _a.sent();
                        return [2 /*return*/, snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); })];
                }
            });
        });
    },
};
// ============================================================================
// VENDORS (Water, Gas, Groceries)
// ============================================================================
exports.vendorRepository = {
    findByTypeAndArea: function (type, area) {
        return __awaiter(this, void 0, void 0, function () {
            var ref, snap, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ref = db.collection(catalog_types_1.COLLECTIONS.vendors)
                            .where('active', '==', true)
                            .where('type', '==', type);
                        return [4 /*yield*/, ref.get()];
                    case 1:
                        snap = _a.sent();
                        results = snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                        if (area) {
                            results = results.filter(function (v) {
                                return v.coverageAreas.some(function (a) { return a.toLowerCase().includes(area.toLowerCase()); });
                            });
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.vendors).doc(id).get()];
                    case 1:
                        doc = _a.sent();
                        return [2 /*return*/, doc.exists ? __assign({ id: doc.id }, doc.data()) : null];
                }
            });
        });
    },
};
// ============================================================================
// SERVICE PROVIDERS
// ============================================================================
exports.serviceProviderRepository = {
    findByServiceAndArea: function (serviceType, area) {
        return __awaiter(this, void 0, void 0, function () {
            var ref, snap, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ref = db.collection(catalog_types_1.COLLECTIONS.serviceProviders)
                            .where('active', '==', true)
                            .where('services', 'array-contains', serviceType);
                        return [4 /*yield*/, ref.get()];
                    case 1:
                        snap = _a.sent();
                        results = snap.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                        if (area) {
                            results = results.filter(function (p) {
                                return p.coverageAreas.some(function (a) { return a.toLowerCase().includes(area.toLowerCase()); });
                            });
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    },
    getById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.serviceProviders).doc(id).get()];
                    case 1:
                        doc = _a.sent();
                        return [2 /*return*/, doc.exists ? __assign({ id: doc.id }, doc.data()) : null];
                }
            });
        });
    },
};
// ============================================================================
// PHARMACIES ON DUTY
// ============================================================================
exports.pharmacyRepository = {
    getTodaysPharmacies: function (district) {
        return __awaiter(this, void 0, void 0, function () {
            var today, doc, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        today = new Date().toISOString().split('T')[0];
                        return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.pharmaciesOnDuty).doc(today).get()];
                    case 1:
                        doc = _a.sent();
                        if (!doc.exists)
                            return [2 /*return*/, null];
                        data = doc.data();
                        if (district) {
                            data.pharmacies = data.pharmacies.filter(function (p) {
                                return p.district.toLowerCase().includes(district.toLowerCase());
                            });
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    },
};
// ============================================================================
// NEWS CACHE
// ============================================================================
exports.newsRepository = {
    getLatest: function () {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection(catalog_types_1.COLLECTIONS.newsCache).doc('latest').get()];
                    case 1:
                        doc = _a.sent();
                        return [2 /*return*/, doc.exists ? doc.data() : null];
                }
            });
        });
    },
};
