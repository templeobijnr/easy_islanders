"use strict";
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
exports.placesRepository = void 0;
/**
 * Places Repository
 * Manages venues (restaurants, bars, cafes, sights, etc.)
 */
var firebase_1 = require("../config/firebase");
var COLLECTION = 'places';
exports.placesRepository = {
    /**
     * Create a new place
     */
    create: function (place) {
        return __awaiter(this, void 0, void 0, function () {
            var now, docRef;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date().toISOString();
                        return [4 /*yield*/, firebase_1.db.collection(COLLECTION).add(__assign(__assign({}, place), { createdAt: now, updatedAt: now }))];
                    case 1:
                        docRef = _a.sent();
                        return [2 /*return*/, __assign(__assign({ id: docRef.id }, place), { createdAt: now, updatedAt: now })];
                }
            });
        });
    },
    /**
     * Get place by ID
     */
    getById: function (placeId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(placeId).get()];
                    case 1:
                        doc = _a.sent();
                        if (!doc.exists) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, __assign({ id: doc.id }, doc.data())];
                }
            });
        });
    },
    /**
     * Search places by category
     */
    getByCategory: function (cityId, category) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db
                            .collection(COLLECTION)
                            .where('cityId', '==', cityId)
                            .where('category', '==', category)
                            .where('isActive', '==', true)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Get all places in a city
     */
    getByCityId: function (cityId_1) {
        return __awaiter(this, arguments, void 0, function (cityId, activeOnly) {
            var query, snapshot;
            if (activeOnly === void 0) { activeOnly = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = firebase_1.db.collection(COLLECTION).where('cityId', '==', cityId);
                        if (activeOnly) {
                            query = query.where('isActive', '==', true);
                        }
                        return [4 /*yield*/, query.get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Get places by area
     */
    getByArea: function (cityId, areaId) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db
                            .collection(COLLECTION)
                            .where('cityId', '==', cityId)
                            .where('areaId', '==', areaId)
                            .where('isActive', '==', true)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Get featured places
     */
    getFeatured: function (cityId) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db
                            .collection(COLLECTION)
                            .where('cityId', '==', cityId)
                            .where('isFeatured', '==', true)
                            .where('isActive', '==', true)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Search places by tags
     */
    getByTags: function (cityId, tags) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db
                            .collection(COLLECTION)
                            .where('cityId', '==', cityId)
                            .where('tags', 'array-contains-any', tags)
                            .where('isActive', '==', true)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Get places with taxi enabled
     */
    getWithTaxiEnabled: function (cityId) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db
                            .collection(COLLECTION)
                            .where('cityId', '==', cityId)
                            .where('actions.taxiEnabled', '==', true)
                            .where('isActive', '==', true)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                }
            });
        });
    },
    /**
     * Update place
     */
    update: function (placeId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(placeId).set(__assign(__assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Delete place (soft delete)
     */
    delete: function (placeId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(placeId).set({
                            isActive: false,
                            updatedAt: new Date().toISOString(),
                        }, { merge: true })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
};
