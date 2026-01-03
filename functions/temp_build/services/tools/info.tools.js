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
exports.infoTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Consumer Tools: Information & Discovery
 *
 * Read-only tools for pharmacies, news, exchange rates, events.
 */
var logger = __importStar(require("firebase-functions/logger"));
var admin_catalog_repository_1 = require("../../repositories/admin-catalog.repository");
exports.infoTools = {
    /**
     * Find on-duty pharmacies for today
     */
    findPharmacy: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var data, pharmacies, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('[InfoTools] Finding pharmacies', args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, admin_catalog_repository_1.pharmacyRepository.getTodaysPharmacies(args.district)];
                case 2:
                    data = _a.sent();
                    if (!data || data.pharmacies.length === 0) {
                        return [2 /*return*/, {
                                success: true,
                                pharmacies: [],
                                message: 'No on-duty pharmacy information available for today.',
                            }];
                    }
                    pharmacies = data.pharmacies.map(function (p) { return ({
                        name: p.name,
                        address: p.address,
                        phone: p.phone,
                        district: p.district,
                        mapsLink: p.geo
                            ? "https://www.google.com/maps?q=".concat(p.geo.lat, ",").concat(p.geo.lng)
                            : "https://www.google.com/maps/search/".concat(encodeURIComponent(p.address)),
                    }); });
                    return [2 /*return*/, {
                            success: true,
                            date: data.date,
                            pharmacies: pharmacies,
                            message: "Found ".concat(pharmacies.length, " on-duty pharmacy(s) for today."),
                        }];
                case 3:
                    err_1 = _a.sent();
                    logger.error('[InfoTools] Pharmacy lookup failed', err_1);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Get latest news
     */
    getNews: function () { return __awaiter(void 0, void 0, void 0, function () {
        var data, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('[InfoTools] Getting news');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, admin_catalog_repository_1.newsRepository.getLatest()];
                case 2:
                    data = _a.sent();
                    if (!data || data.articles.length === 0) {
                        return [2 /*return*/, {
                                success: true,
                                articles: [],
                                message: 'No news available at the moment.',
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            articles: data.articles.slice(0, 5).map(function (a) { return ({
                                title: a.title,
                                source: a.source,
                                url: a.url,
                                publishedAt: a.publishedAt,
                            }); }),
                            message: "Here are the latest headlines from North Cyprus.",
                        }];
                case 3:
                    err_2 = _a.sent();
                    logger.error('[InfoTools] News fetch failed', err_2);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Get exchange rates
     */
    getExchangeRate: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var base, target, rates, rate;
        var _a;
        return __generator(this, function (_b) {
            logger.info('[InfoTools] Getting exchange rates', args);
            try {
                base = (args.from || 'EUR').toUpperCase();
                target = (args.to || 'TRY').toUpperCase();
                rates = {
                    EUR: { TRY: 37.5, GBP: 0.84, USD: 1.08 },
                    GBP: { TRY: 44.5, EUR: 1.19, USD: 1.29 },
                    USD: { TRY: 34.7, EUR: 0.93, GBP: 0.78 },
                    TRY: { EUR: 0.027, GBP: 0.022, USD: 0.029 },
                };
                rate = (_a = rates[base]) === null || _a === void 0 ? void 0 : _a[target];
                if (!rate) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Cannot find rate for ".concat(base, " to ").concat(target),
                        }];
                }
                return [2 /*return*/, {
                        success: true,
                        from: base,
                        to: target,
                        rate: rate,
                        formatted: "1 ".concat(base, " = ").concat(rate.toFixed(4), " ").concat(target),
                        note: 'Approximate rate. Check bank for exact rates.',
                    }];
            }
            catch (err) {
                logger.error('[InfoTools] Exchange rate failed', err);
                return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err) }];
            }
            return [2 /*return*/];
        });
    }); },
    /**
     * Show directions to a place (Google Maps deeplink)
     */
    showDirections: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var mapsUrl;
        return __generator(this, function (_a) {
            logger.info('[InfoTools] Getting directions', args);
            if (args.lat && args.lng) {
                mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=".concat(args.lat, ",").concat(args.lng);
            }
            else {
                mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=".concat(encodeURIComponent(args.destination));
            }
            return [2 /*return*/, {
                    success: true,
                    destination: args.destination,
                    mapsUrl: mapsUrl,
                    message: "\uD83D\uDCCD **Directions to ".concat(args.destination, "**\n\n[Open in Google Maps](").concat(mapsUrl, ")"),
                }];
        });
    }); },
};
