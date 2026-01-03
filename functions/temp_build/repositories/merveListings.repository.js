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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merveListingsRepository = void 0;
var firebase_1 = require("../config/firebase");
var LEGACY_ACTIONS_BY_TOOLTYPE = {
    restaurant: ['order_food', 'reserve_table', 'inquire'],
    provider: ['book_service', 'request_service', 'inquire'],
    activity: ['book_activity', 'inquire'],
    stay: ['book_stay', 'inquire'],
};
function normalizeMerve(merve) {
    if (!merve || typeof merve !== 'object')
        return null;
    var enabled = Boolean(merve.enabled);
    if (!enabled)
        return { enabled: false, actions: [] };
    var actionsRaw = Array.isArray(merve.actions) ? merve.actions : [];
    var actions = actionsRaw
        .filter(function (a) { return a && typeof a === 'object'; })
        .map(function (a) {
        var _a, _b;
        return ({
            id: String(a.id || ''),
            actionType: a.actionType,
            enabled: Boolean(a.enabled),
            dispatch: {
                channel: 'whatsapp',
                toE164: typeof ((_a = a.dispatch) === null || _a === void 0 ? void 0 : _a.toE164) === 'string' ? a.dispatch.toE164 : undefined,
                template: typeof ((_b = a.dispatch) === null || _b === void 0 ? void 0 : _b.template) === 'string' ? a.dispatch.template : undefined,
            },
            data: a.data && typeof a.data === 'object' ? {
                kind: a.data.kind,
                required: Boolean(a.data.required),
            } : undefined,
            tags: Array.isArray(a.tags) ? a.tags.filter(function (t) { return typeof t === 'string'; }) : undefined,
            notes: typeof a.notes === 'string' ? a.notes : undefined,
        });
    })
        .filter(function (a) { return Boolean(a.actionType); });
    // Legacy fallback: derive actions from toolType/dispatchTemplate
    if (actions.length === 0 && typeof merve.toolType === 'string') {
        var toolType_1 = merve.toolType;
        var legacyTypes = toolType_1 ? LEGACY_ACTIONS_BY_TOOLTYPE[toolType_1] : undefined;
        var dispatchTemplate_1 = typeof merve.dispatchTemplate === 'string' ? merve.dispatchTemplate : undefined;
        if (legacyTypes === null || legacyTypes === void 0 ? void 0 : legacyTypes.length) {
            return {
                enabled: true,
                whatsappE164: typeof merve.whatsappE164 === 'string' ? merve.whatsappE164 : undefined,
                geo: merve.geo,
                coverageAreas: Array.isArray(merve.coverageAreas) ? merve.coverageAreas : undefined,
                tags: Array.isArray(merve.tags) ? merve.tags : undefined,
                toolType: toolType_1,
                dispatchTemplate: dispatchTemplate_1,
                actions: legacyTypes.map(function (actionType) { return ({
                    id: "legacy_".concat(toolType_1, "_").concat(actionType),
                    actionType: actionType,
                    enabled: true,
                    dispatch: {
                        channel: 'whatsapp',
                        template: dispatchTemplate_1,
                    },
                }); }),
            };
        }
    }
    return {
        enabled: true,
        whatsappE164: typeof merve.whatsappE164 === 'string' ? merve.whatsappE164 : undefined,
        geo: merve.geo,
        coverageAreas: Array.isArray(merve.coverageAreas) ? merve.coverageAreas : undefined,
        tags: Array.isArray(merve.tags) ? merve.tags : undefined,
        actionTypesEnabled: Array.isArray(merve.actionTypesEnabled) ? merve.actionTypesEnabled : undefined,
        actions: actions,
    };
}
function listingTitle(listing) {
    return (listing.title || listing.name || '').trim();
}
function matchText(haystack, needle) {
    if (!(needle === null || needle === void 0 ? void 0 : needle.trim()))
        return true;
    return haystack.toLowerCase().includes(needle.toLowerCase());
}
function matchAnyTag(tags, query) {
    if (!(query === null || query === void 0 ? void 0 : query.trim()))
        return true;
    var q = query.toLowerCase();
    return tags.some(function (t) { return t.toLowerCase().includes(q); });
}
exports.merveListingsRepository = {
    findById: function (listingId) {
        return __awaiter(this, void 0, void 0, function () {
            var snap, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection('listings').doc(listingId).get()];
                    case 1:
                        snap = _a.sent();
                        if (!snap.exists)
                            return [2 /*return*/, null];
                        data = snap.data();
                        return [2 /*return*/, __assign(__assign({ id: snap.id }, data), { merve: normalizeMerve(data === null || data === void 0 ? void 0 : data.merve) })];
                }
            });
        });
    },
    searchByAction: function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var limit, indexedQuery, fallbackQuery, snap, _a, results, _i, _b, docSnap, raw, merve, enabled, coverage, tags;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        limit = Math.min(Math.max(args.limit || 20, 1), 50);
                        indexedQuery = firebase_1.db.collection('listings')
                            .where('merve.enabled', '==', true)
                            .where('merve.actionTypesEnabled', 'array-contains', args.actionType)
                            .limit(limit);
                        fallbackQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, firebase_1.db.collection('listings')
                                        .where('merve.enabled', '==', true)
                                        .limit(200)
                                        .get()];
                            });
                        }); };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 7]);
                        return [4 /*yield*/, indexedQuery.get()];
                    case 2:
                        snap = _c.sent();
                        if (!snap.empty) return [3 /*break*/, 4];
                        return [4 /*yield*/, fallbackQuery()];
                    case 3:
                        snap = _c.sent();
                        _c.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        _a = _c.sent();
                        return [4 /*yield*/, fallbackQuery()];
                    case 6:
                        snap = _c.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        results = [];
                        for (_i = 0, _b = snap.docs; _i < _b.length; _i++) {
                            docSnap = _b[_i];
                            raw = docSnap.data();
                            merve = normalizeMerve(raw === null || raw === void 0 ? void 0 : raw.merve);
                            if (!(merve === null || merve === void 0 ? void 0 : merve.enabled))
                                continue;
                            enabled = merve.actions.some(function (a) { return a.enabled && a.actionType === args.actionType; });
                            if (!enabled)
                                continue;
                            // Optional: market/city scoping
                            if (args.marketId && typeof raw.cityId === 'string' && raw.cityId !== args.marketId) {
                                // Keep permissive; only apply if cityId field is present.
                            }
                            // Optional filters
                            if (!matchText(listingTitle(__assign({ id: docSnap.id }, raw)), args.name))
                                continue;
                            coverage = Array.isArray(merve.coverageAreas) ? merve.coverageAreas : [];
                            if (args.area && coverage.length && !matchAnyTag(coverage, args.area))
                                continue;
                            tags = __spreadArray(__spreadArray([], (Array.isArray(merve.tags) ? merve.tags : []), true), (Array.isArray(raw.tags) ? raw.tags : []), true);
                            if (!matchAnyTag(tags, args.tag))
                                continue;
                            results.push(__assign(__assign({ id: docSnap.id }, raw), { merve: merve }));
                        }
                        return [2 /*return*/, results.slice(0, limit)];
                }
            });
        });
    },
    getEnabledAction: function (merve, actionType) {
        if (!(merve === null || merve === void 0 ? void 0 : merve.enabled))
            return null;
        var action = merve.actions.find(function (a) { return a.enabled && a.actionType === actionType; }) || null;
        return action;
    },
    getWhatsAppTarget: function (merve, action) {
        var _a, _b, _c;
        var perAction = (_b = (_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.toE164) === null || _b === void 0 ? void 0 : _b.trim();
        if (perAction)
            return perAction;
        var fallback = (_c = merve.whatsappE164) === null || _c === void 0 ? void 0 : _c.trim();
        if (fallback)
            return fallback;
        return null;
    },
};
