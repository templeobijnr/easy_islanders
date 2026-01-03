"use strict";
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
exports.businessTools = void 0;
var firebase_1 = require("../../config/firebase");
var firestore_1 = require("firebase-admin/firestore");
var toolContext_1 = require("./toolContext");
var errors_1 = require("../../utils/errors");
var now = firestore_1.FieldValue.serverTimestamp;
// ─────────────────────────────────────────────────────────────────────────────
// Business Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.businessTools = {
    updateBusinessInfo: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).set({
                            name: args.name,
                            description: args.description,
                            phone: args.phone,
                            updatedAt: now()
                        }, { merge: true })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    updateBusinessAvailability: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).set({
                            availability: args.availability,
                            updatedAt: now()
                        }, { merge: true })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_2 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    updateBusinessHours: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).set({
                            hours: args.hours,
                            updatedAt: now()
                        }, { merge: true })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_3 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_3) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    uploadBusinessMedia: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, mediaId, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    mediaId = firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc().id;
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
                            mediaUrl: args.mediaUrl,
                            uploadedAt: now()
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_4 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_4) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    listBusinessLeads: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, snap, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get()];
                case 2:
                    snap = _a.sent();
                    return [2 /*return*/, { success: true, leads: snap.docs.map(function (d) { return d.data(); }) }];
                case 3:
                    err_5 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_5) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    respondToLead: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
                            response: args.message,
                            respondedAt: now()
                        }, { merge: true })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_6 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_6) }];
                case 4: return [2 /*return*/];
            }
        });
    }); }
};
