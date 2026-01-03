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
exports.serviceTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Consumer Tools: Service Booking
 *
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 *
 * Books plumbers, electricians, handymen, AC technicians, etc.
 */
var firestore_1 = require("firebase-admin/firestore");
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var merveListings_repository_1 = require("../../repositories/merveListings.repository");
var catalog_types_1 = require("../../types/catalog.types");
var merveConfig_repository_1 = require("../../repositories/merveConfig.repository");
var template_1 = require("../domains/merve/template");
// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================
exports.serviceTools = {
    /**
     * Find service providers by type and area
     */
    findServiceProviders: function (args, ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var providers, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('[ServiceTools] Finding providers', args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'request_service',
                            area: args.area,
                            tag: args.serviceType,
                            marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                            limit: 15,
                        })];
                case 2:
                    providers = _a.sent();
                    if (!(providers.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'book_service',
                            area: args.area,
                            tag: args.serviceType,
                            marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                            limit: 15,
                        })];
                case 3:
                    providers = _a.sent();
                    _a.label = 4;
                case 4:
                    if (providers.length === 0) {
                        return [2 /*return*/, {
                                success: true,
                                providers: [],
                                message: "No ".concat(args.serviceType, " providers found in your area."),
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            providers: providers.map(function (p) { return ({
                                id: p.id,
                                name: (p.title || p.name || '').trim(),
                                services: (p.merve.tags || p.tags || []).join(', '),
                                areas: (p.merve.coverageAreas || []).join(', '),
                                rating: p.rating,
                                responseTime: p.responseTime,
                            }); }),
                            message: "Found ".concat(providers.length, " ").concat(args.serviceType, " provider(s)."),
                        }];
                case 5:
                    err_1 = _a.sent();
                    logger.error('[ServiceTools] Search failed', err_1);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 6: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Book a service (proposal phase)
     * Returns pendingAction for confirmation gate.
     */
    bookService: function (args, context) { return __awaiter(void 0, void 0, void 0, function () {
        var userSnap, userData, customerName, customerPhone, chosenActionType, providers, provider, requestId, request, urgencyLabels, summary, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('[ServiceTools] Booking service', { args: args, userId: context.userId });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, firebase_1.db.collection('users').doc(context.userId).get()];
                case 2:
                    userSnap = _a.sent();
                    userData = userSnap.data() || {};
                    customerName = userData.displayName || 'Guest';
                    customerPhone = userData.phone || userData.phoneE164 || '';
                    chosenActionType = 'request_service';
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'request_service',
                            area: args.area,
                            tag: args.serviceType,
                            marketId: context.marketId,
                            limit: 10,
                        })];
                case 3:
                    providers = _a.sent();
                    if (!(providers.length === 0)) return [3 /*break*/, 5];
                    chosenActionType = 'book_service';
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'book_service',
                            area: args.area,
                            tag: args.serviceType,
                            marketId: context.marketId,
                            limit: 10,
                        })];
                case 4:
                    providers = _a.sent();
                    _a.label = 5;
                case 5:
                    if (providers.length === 0) {
                        return [2 /*return*/, {
                                success: false,
                                error: "No ".concat(args.serviceType, " providers available in your area."),
                            }];
                    }
                    provider = providers[0];
                    requestId = "SRV-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 8));
                    request = {
                        id: requestId,
                        providerId: provider.id,
                        providerName: (provider.title || provider.name || '').trim(),
                        userId: context.userId,
                        customerName: customerName,
                        customerPhone: customerPhone,
                        serviceType: args.serviceType,
                        address: args.address,
                        description: args.description,
                        urgency: args.urgency || 'flexible',
                        status: 'pending',
                        marketId: context.marketId || 'nc',
                        actionType: chosenActionType,
                        createdAt: firestore_1.Timestamp.now(),
                        updatedAt: firestore_1.Timestamp.now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection(catalog_types_1.COLLECTIONS.serviceRequests).doc(requestId).set(request)];
                case 6:
                    _a.sent();
                    urgencyLabels = {
                        emergency: '🚨 Emergency',
                        today: '📅 Today',
                        this_week: '📆 This week',
                        flexible: '🔄 Flexible',
                    };
                    summary = "\uD83D\uDD27 Service: ".concat(args.serviceType, "\n") +
                        "\uD83D\uDC77 Provider: ".concat((provider.title || provider.name || '').trim(), "\n") +
                        "\uD83D\uDCCD Address: ".concat(args.address, "\n") +
                        "\u23F0 Urgency: ".concat(urgencyLabels[args.urgency || 'flexible'], "\n") +
                        "\uD83D\uDCDD Issue: ".concat(args.description);
                    // 4. Return pendingAction for confirmation gate
                    return [2 /*return*/, {
                            success: true,
                            proposal: true,
                            requestId: requestId,
                            providerName: provider.name,
                            serviceType: args.serviceType,
                            summary: summary,
                            pendingAction: {
                                kind: 'confirm_service',
                                requestId: requestId,
                                holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                                summary: summary,
                                expectedUserId: context.userId,
                                createdAt: new Date(),
                            },
                        }];
                case 7:
                    err_2 = _a.sent();
                    logger.error('[ServiceTools] Booking failed', err_2);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 8: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Confirm and dispatch service request via WhatsApp
     */
    confirmServiceRequest: function (requestId) { return __awaiter(void 0, void 0, void 0, function () {
        var requestRef, requestSnap, request, provider, merve, actionType, action, to, urgencyLabels, marketId, toolPolicy, defaultTemplate, template, message, sendWhatsApp, result, err_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.info('[ServiceTools] Confirming request', { requestId: requestId });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
                    requestRef = firebase_1.db.collection(catalog_types_1.COLLECTIONS.serviceRequests).doc(requestId);
                    return [4 /*yield*/, requestRef.get()];
                case 2:
                    requestSnap = _b.sent();
                    if (!requestSnap.exists) {
                        return [2 /*return*/, { success: false, error: 'Request not found' }];
                    }
                    request = requestSnap.data();
                    if (request.status !== 'pending') {
                        return [2 /*return*/, { success: false, error: "Request already ".concat(request.status) }];
                    }
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.findById(request.providerId)];
                case 3:
                    provider = _b.sent();
                    if (!provider) {
                        return [2 /*return*/, { success: false, error: 'Provider not found' }];
                    }
                    merve = provider.merve;
                    if (!(merve === null || merve === void 0 ? void 0 : merve.enabled)) {
                        return [2 /*return*/, { success: false, error: 'Listing is not Merve-enabled' }];
                    }
                    actionType = request.actionType || 'request_service';
                    action = merveListings_repository_1.merveListingsRepository.getEnabledAction(merve, actionType);
                    if (!action) {
                        return [2 /*return*/, { success: false, error: "Listing does not support ".concat(actionType) }];
                    }
                    to = merveListings_repository_1.merveListingsRepository.getWhatsAppTarget(merve, action);
                    if (!to) {
                        return [2 /*return*/, { success: false, error: 'Missing WhatsApp target for dispatch' }];
                    }
                    urgencyLabels = {
                        emergency: '🚨 EMERGENCY',
                        today: 'Today',
                        this_week: 'This week',
                        flexible: 'Flexible timing',
                    };
                    marketId = request.marketId || 'nc';
                    return [4 /*yield*/, merveConfig_repository_1.merveConfigRepository.getToolPolicy(marketId, 'bookService')];
                case 4:
                    toolPolicy = _b.sent();
                    defaultTemplate = (toolPolicy === null || toolPolicy === void 0 ? void 0 : toolPolicy.defaultTemplate) || "\uD83C\uDD95 New Service Request!\n\nService: {serviceType}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}\nUrgency: {urgency}\n\nIssue: {description}";
                    template = ((_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.template) || defaultTemplate;
                    message = (0, template_1.renderTemplate)(template, {
                        customerName: request.customerName,
                        customerPhone: request.customerPhone,
                        serviceType: request.serviceType,
                        address: request.address,
                        description: request.description,
                        urgency: urgencyLabels[request.urgency],
                    });
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../services/twilio.service')); })];
                case 5:
                    sendWhatsApp = (_b.sent()).sendWhatsApp;
                    return [4 /*yield*/, sendWhatsApp(to, message)];
                case 6:
                    result = _b.sent();
                    // Update request status
                    return [4 /*yield*/, requestRef.update({
                            status: 'confirmed',
                            dispatchMessageSid: result.sid,
                            updatedAt: firestore_1.Timestamp.now(),
                        })];
                case 7:
                    // Update request status
                    _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            requestId: requestId,
                            status: 'confirmed',
                            message: "\u2705 Request sent! They will contact you shortly.",
                        }];
                case 8:
                    err_3 = _b.sent();
                    logger.error('[ServiceTools] Confirmation failed', err_3);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_3) }];
                case 9: return [2 /*return*/];
            }
        });
    }); },
};
