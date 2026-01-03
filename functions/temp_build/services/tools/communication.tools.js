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
exports.communicationTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Communication Tools
 *
 * Handles WhatsApp messages, notifications, and user communications.
 */
var logger = __importStar(require("firebase-functions/logger"));
var firestore_1 = require("firebase-admin/firestore");
var firebase_1 = require("../../config/firebase");
var dispatch_service_1 = require("../domains/dispatch/dispatch.service");
var now = firestore_1.FieldValue.serverTimestamp;
exports.communicationTools = {
    /**
     * Send a WhatsApp message via Twilio
     */
    sendWhatsAppMessage: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var dispatch, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("📱 [WhatsApp] Sending message:", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, dispatch_service_1.DispatchService.sendWhatsApp({
                            kind: "user_notification",
                            toE164: args.recipient,
                            body: args.message,
                            correlationId: "tool:sendWhatsAppMessage:".concat(args.userId || "unknown"),
                            idempotencyKey: "tool_whatsapp:".concat(args.userId || "unknown", ":").concat(args.recipient, ":").concat(Date.now()),
                            traceId: "tool-".concat(Date.now()),
                        })];
                case 2:
                    dispatch = _a.sent();
                    // Log notification to database
                    return [4 /*yield*/, firebase_1.db.collection("notifications").add({
                            userId: args.userId || null,
                            channel: "whatsapp",
                            message: args.message,
                            to: args.recipient,
                            status: "sent",
                            createdAt: now(),
                        })];
                case 3:
                    // Log notification to database
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            status: "sent",
                            sid: dispatch.providerMessageId,
                        }];
                case 4:
                    err_1 = _a.sent();
                    console.error("🔴 [WhatsApp] Failed:", err_1);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_1) || "send failed",
                        }];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Send an in-app notification
     */
    sendAppNotification: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🔔 [Notification] Sending app notification:", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db.collection("notifications").add({
                            userId: args.userId,
                            channel: "app",
                            title: args.title || "Notification",
                            message: args.message,
                            type: args.type || "info",
                            read: false,
                            createdAt: now(),
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message: "Notification sent",
                        }];
                case 3:
                    err_2 = _a.sent();
                    console.error("🔴 [Notification] Failed:", err_2);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_2) || "Failed to send notification",
                        }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Send an email notification
     * @future Implement email service integration
     */
    sendEmailNotification: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var to, body;
        return __generator(this, function (_a) {
            to = args.to || args.email;
            body = args.body || args.message;
            logger.debug("📧 [Email] Sending email notification:", {
                to: to,
                subject: args.subject,
                preview: (body || "").slice(0, 80),
            });
            // TODO: Implement actual email service (SendGrid, etc.)
            console.warn("⚠️ Email service not yet implemented");
            return [2 /*return*/, {
                    success: false,
                    error: "Email service not implemented yet",
                }];
        });
    }); },
};
