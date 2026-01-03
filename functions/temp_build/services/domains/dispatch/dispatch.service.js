"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.DispatchService = exports.RetryableSideEffectError = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var errors_1 = require("../../../utils/errors");
var dispatch_repository_1 = require("./dispatch.repository");
var RetryableSideEffectError = /** @class */ (function (_super) {
    __extends(RetryableSideEffectError, _super);
    function RetryableSideEffectError(message) {
        var _this = _super.call(this, message) || this;
        _this.retryable = true;
        _this.name = "RetryableSideEffectError";
        return _this;
    }
    return RetryableSideEffectError;
}(Error));
exports.RetryableSideEffectError = RetryableSideEffectError;
function nowIso() {
    return new Date().toISOString();
}
function requireE164(value, field) {
    if (!value || typeof value !== "string" || !value.match(/^\+\d{10,15}$/)) {
        throw new Error("DispatchService: ".concat(field, " must be E.164 (+##########)"));
    }
}
exports.DispatchService = {
    /**
     * Canonical write-before-send WhatsApp dispatch.
     *
     * Fail-closed:
     * - If we cannot reserve the DispatchMessage record, we do not call provider.
     * - If the record indicates already-sent, we do not call provider.
     */
    sendWhatsApp: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var kind, toE164, body, correlationId, idempotencyKey, traceId, attemptId, reserved, err_1, send, result, updated, err_2, msg, markErr_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        kind = params.kind, toE164 = params.toE164, body = params.body, correlationId = params.correlationId, idempotencyKey = params.idempotencyKey, traceId = params.traceId;
                        requireE164(toE164, "toE164");
                        if (!body)
                            throw new Error("DispatchService: body is required");
                        if (!correlationId)
                            throw new Error("DispatchService: correlationId is required");
                        if (!idempotencyKey)
                            throw new Error("DispatchService: idempotencyKey is required");
                        if (!traceId)
                            throw new Error("DispatchService: traceId is required");
                        attemptId = "".concat(traceId, ":").concat(Date.now());
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, dispatch_repository_1.dispatchRepository.reserveForSend({
                                idempotencyKey: idempotencyKey,
                                attemptId: attemptId,
                                maxAttempts: 5,
                                createIfMissing: {
                                    id: idempotencyKey,
                                    kind: kind,
                                    channel: "whatsapp",
                                    jobId: params.jobId,
                                    threadId: params.threadId,
                                    correlationId: correlationId,
                                    idempotencyKey: idempotencyKey,
                                    toE164: toE164,
                                    body: body,
                                    traceId: traceId,
                                    attempts: 0,
                                    createdAt: nowIso(),
                                    updatedAt: nowIso(),
                                },
                            })];
                    case 2:
                        reserved = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        logger.error("[DispatchService] Reserve failed (fail-closed)", {
                            traceId: traceId,
                            idempotencyKey: idempotencyKey,
                            error: (0, errors_1.getErrorMessage)(err_1) || String(err_1),
                        });
                        throw new RetryableSideEffectError("Dispatch reserve failed; retry later");
                    case 4:
                        if (!reserved.canSend) {
                            return [2 /*return*/, reserved.record];
                        }
                        send = params.sendFn
                            ? params.sendFn
                            : function (to, msg) { return __awaiter(_this, void 0, void 0, function () {
                                var sendWhatsApp, r;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("../../twilio.service")); })];
                                        case 1:
                                            sendWhatsApp = (_a.sent()).sendWhatsApp;
                                            return [4 /*yield*/, sendWhatsApp(to, msg)];
                                        case 2:
                                            r = _a.sent();
                                            return [2 /*return*/, { sid: r.sid }];
                                    }
                                });
                            }); };
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 9, , 14]);
                        return [4 /*yield*/, send(toE164, body)];
                    case 6:
                        result = _a.sent();
                        return [4 /*yield*/, dispatch_repository_1.dispatchRepository.markSent(idempotencyKey, { providerMessageId: result.sid })];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, dispatch_repository_1.dispatchRepository.get(idempotencyKey)];
                    case 8:
                        updated = _a.sent();
                        if (!updated)
                            throw new Error("Dispatch record missing after markSent");
                        return [2 /*return*/, updated];
                    case 9:
                        err_2 = _a.sent();
                        msg = (0, errors_1.getErrorMessage)(err_2) || "Provider send failed";
                        logger.error("[DispatchService] Provider send failed", { traceId: traceId, idempotencyKey: idempotencyKey, error: msg });
                        _a.label = 10;
                    case 10:
                        _a.trys.push([10, 12, , 13]);
                        return [4 /*yield*/, dispatch_repository_1.dispatchRepository.markFailed(idempotencyKey, msg)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        markErr_1 = _a.sent();
                        // Fail-closed principle still holds for future retries: record exists (sending/failed) so we won't double-send.
                        logger.error("[DispatchService] Failed to mark dispatch as failed", {
                            traceId: traceId,
                            idempotencyKey: idempotencyKey,
                            error: (0, errors_1.getErrorMessage)(markErr_1) || String(markErr_1),
                        });
                        return [3 /*break*/, 13];
                    case 13: throw new RetryableSideEffectError(msg);
                    case 14: return [2 /*return*/];
                }
            });
        });
    },
};
