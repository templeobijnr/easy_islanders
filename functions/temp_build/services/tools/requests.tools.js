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
exports.requestsTools = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var admin = __importStar(require("firebase-admin"));
var shared_1 = require("@askmerve/shared");
// ─────────────────────────────────────────────────────────────────────────────
// Requests Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.requestsTools = {
    /**
     * Create a generic service request
     */
    createServiceRequest: function (args, ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var resolvedMarketId, userId, now, ref, request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🛠️ [Requests] Create Service Request:", args);
                    resolvedMarketId = ctx.marketId || ctx.cityId || shared_1.DEFAULT_MARKET_ID;
                    userId = ctx.userId;
                    now = new Date();
                    ref = firebase_1.db.collection("requests").doc();
                    request = {
                        id: ref.id,
                        cityId: resolvedMarketId,
                        type: "SERVICE",
                        userId: userId || "anonymous",
                        status: "new",
                        createdAt: admin.firestore.Timestamp.fromDate(now),
                        updatedAt: admin.firestore.Timestamp.fromDate(now),
                        assignedProviderId: undefined,
                        origin: args.addressText ? { addressText: args.addressText } : undefined,
                        service: {
                            title: args.title || args.serviceSubcategory || args.serviceCategory || 'Service Request',
                            description: args.description || '',
                        },
                        meta: {
                            serviceCategory: args.serviceCategory,
                            serviceSubcategory: args.serviceSubcategory,
                            scheduledTimeText: args.scheduledTimeText,
                        },
                    };
                    return [4 /*yield*/, ref.set(request)];
                case 1:
                    _a.sent();
                    logger.debug("\u2705 [Requests] Created Service Request ".concat(ref.id));
                    return [2 /*return*/, {
                            success: true,
                            requestId: ref.id,
                            message: "Service request created successfully. We will find a provider for you.",
                        }];
            }
        });
    }); },
    /**
     * Create an order for water, gas, or groceries
     */
    createOrder: function (args, ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var resolvedMarketId, userId, now, addressText, ref, request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🛒 [Requests] Create Order:", args);
                    resolvedMarketId = ctx.marketId || ctx.cityId || shared_1.DEFAULT_MARKET_ID;
                    userId = ctx.userId;
                    now = new Date();
                    addressText = (args.addressText || "").trim();
                    if (!addressText) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Delivery address is required before creating an order.",
                                message: "What address should we deliver to?",
                                missing: ["addressText"],
                            }];
                    }
                    // Quantity is required for all orders (fail-closed: do not guess)
                    if (!args.quantity || !Number.isFinite(args.quantity) || args.quantity < 1) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Quantity is required before creating an order.",
                                message: "How many do you want?",
                                missing: ["quantity"],
                            }];
                    }
                    // Water orders require bottle size (do not assume 12L/19L)
                    if (args.orderType === "water" && (!args.bottleSizeLiters || args.bottleSizeLiters <= 0)) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Bottle size is required for water orders.",
                                message: "What bottle size (in liters) do you want (e.g., 19)?",
                                missing: ["bottleSizeLiters"],
                            }];
                    }
                    ref = firebase_1.db.collection("requests").doc();
                    request = {
                        id: ref.id,
                        cityId: resolvedMarketId,
                        type: "ORDER",
                        userId: userId || "anonymous",
                        status: "new",
                        createdAt: admin.firestore.Timestamp.fromDate(now),
                        updatedAt: admin.firestore.Timestamp.fromDate(now),
                        origin: { addressText: addressText },
                        order: {
                            type: args.orderType,
                            bottleSizeLiters: args.bottleSizeLiters,
                            quantity: args.quantity,
                            items: args.groceryItems,
                            notes: args.notes,
                        },
                    };
                    return [4 /*yield*/, ref.set(request)];
                case 1:
                    _a.sent();
                    logger.debug("\u2705 [Requests] Created Order ".concat(ref.id));
                    return [2 /*return*/, {
                            success: true,
                            requestId: ref.id,
                            message: "Order for ".concat(args.orderType, " created successfully."),
                        }];
            }
        });
    }); },
};
