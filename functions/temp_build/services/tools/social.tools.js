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
exports.socialTools = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var firestore_1 = require("firebase-admin/firestore");
var toolContext_1 = require("./toolContext");
var errors_1 = require("../../utils/errors");
var now = firestore_1.FieldValue.serverTimestamp;
// ─────────────────────────────────────────────────────────────────────────────
// Social Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.socialTools = {
    // --- Tribes ---
    createTribe: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, id, payload, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    id = firebase_1.db.collection("tribes").doc().id;
                    payload = {
                        id: id,
                        name: args.name,
                        description: args.description || "",
                        tags: args.tags || [],
                        ownerId: userId,
                        createdAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("tribes").doc(id).set(payload)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true, tribe: payload }];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    joinTribe: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, firebase_1.db
                            .collection("tribes")
                            .doc(args.tribeId)
                            .collection("members")
                            .doc(userId)
                            .set({ joinedAt: now() })];
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
    leaveTribe: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
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
                    return [4 /*yield*/, firebase_1.db
                            .collection("tribes")
                            .doc(args.tribeId)
                            .collection("members")
                            .doc(userId)
                            .delete()];
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
    postToTribe: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, postId, payload, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    postId = firebase_1.db
                        .collection("tribes")
                        .doc(args.tribeId)
                        .collection("posts")
                        .doc().id;
                    payload = {
                        id: postId,
                        content: args.content,
                        mediaUrl: args.mediaUrl || null,
                        userId: userId,
                        createdAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db
                            .collection("tribes")
                            .doc(args.tribeId)
                            .collection("posts")
                            .doc(postId)
                            .set(payload)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true, post: payload }];
                case 3:
                    err_4 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_4) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    listTribeMessages: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("tribes")
                            .doc(args.tribeId)
                            .collection("posts")
                            .orderBy("createdAt", "desc")
                            .limit(args.limit || 20)
                            .get()];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, { success: true, messages: snap.docs.map(function (d) { return d.data(); }) }];
                case 2:
                    err_5 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_5) }];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    getTribeInfo: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.db.collection("tribes").doc(args.tribeId).get()];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, { success: true, tribe: snap.exists ? snap.data() : null }];
                case 2:
                    err_6 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_6) }];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    listTrendingTribes: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("tribes")
                            .orderBy("createdAt", "desc")
                            .limit(50)
                            .get()];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            tribes: snap.docs.slice(0, args.limit || 10).map(function (d) { return d.data(); }),
                        }];
                case 2:
                    err_7 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_7) }];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    // --- Waves ---
    waveUser: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, waveId, payload, err_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    waveId = firebase_1.db.collection("waves").doc().id;
                    payload = {
                        id: waveId,
                        from: userId,
                        to: args.targetUserId,
                        status: "pending",
                        createdAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("waves").doc(waveId).set(payload)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true, waveId: waveId }];
                case 3:
                    err_8 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_8) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    acceptWave: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, err_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("waves")
                            .doc(args.waveId)
                            .set({ status: "accepted", respondedAt: now() }, { merge: true })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    err_9 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_9) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    // --- Check-ins & Discovery ---
    listNearbyUsers: function (_args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, seen_1, users_1, err_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("checkIns")
                            .orderBy("createdAt", "desc")
                            .limit(50)
                            .get()];
                case 1:
                    snap = _a.sent();
                    seen_1 = new Set();
                    users_1 = [];
                    snap.forEach(function (doc) {
                        var data = doc.data();
                        if (data.userId && !seen_1.has(data.userId)) {
                            seen_1.add(data.userId);
                            users_1.push({
                                userId: data.userId,
                                placeId: data.placeId,
                                placeName: data.placeName,
                                location: data.location,
                            });
                        }
                    });
                    return [2 /*return*/, { success: true, users: users_1 }];
                case 2:
                    err_10 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_10) }];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    checkInToPlace: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, checkInId, payload, err_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
                    if (!userId)
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    checkInId = firebase_1.db.collection("checkIns").doc().id;
                    payload = {
                        id: checkInId,
                        userId: userId,
                        placeId: args.placeId,
                        placeName: args.placeName,
                        location: args.location || null,
                        createdAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("checkIns").doc(checkInId).set(payload)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true, checkInId: checkInId }];
                case 3:
                    err_11 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_11) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    getCheckInsForPlace: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, err_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("checkIns")
                            .where("placeId", "==", args.placeId)
                            .orderBy("createdAt", "desc")
                            .limit(args.limit || 20)
                            .get()];
                case 1:
                    snap = _a.sent();
                    return [2 /*return*/, { success: true, checkIns: snap.docs.map(function (d) { return d.data(); }) }];
                case 2:
                    err_12 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_12) }];
                case 3: return [2 /*return*/];
            }
        });
    }); },
    fetchVibeMapData: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("Fetching vibe map data for", args.area);
            return [2 /*return*/, { success: true, area: args.area, hotspots: [] }];
        });
    }); },
};
