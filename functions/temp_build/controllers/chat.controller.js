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
exports.reindexListings = exports.handleChatMessage = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var generative_ai_1 = require("@google/generative-ai");
var tools_1 = require("../utils/tools");
var tool_service_1 = require("../services/agent/tool.service");
var chat_repository_1 = require("../repositories/chat.repository");
var memory_service_1 = require("../services/memory.service");
var firebase_1 = require("../config/firebase");
var user_service_1 = require("../services/user.service");
var transaction_repository_1 = require("../repositories/transaction.repository");
var booking_ledger_tools_1 = require("../services/tools/booking-ledger.tools");
var errors_1 = require("../utils/errors");
// Initialize Gemini lazily
var genAI = null;
var getGenAI = function () {
    if (!genAI) {
        var GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }
        genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genAI;
};
var systemPrompts_1 = require("../utils/systemPrompts");
/**
 * Detects if a user message likely requires a tool call.
 * Used to trigger repair loop if Gemini fails to call a tool.
 */
function detectActionIntent(message) {
    var lower = message.toLowerCase();
    // Stay/Property keywords → searchStays
    var stayPatterns = [
        /\b(rent|rental|rentals|villa|villas|apartment|apartments)\b/,
        /\b(stay|stays|accommodation|daily rental|short-term|long-term)\b/,
        /\b(property|properties|for sale|buy|purchase|house|flat|studio)\b/,
        /\b(bedroom|bed|room|place to stay)\b/,
    ];
    for (var _i = 0, stayPatterns_1 = stayPatterns; _i < stayPatterns_1.length; _i++) {
        var pattern = stayPatterns_1[_i];
        if (pattern.test(lower)) {
            return { requiresTool: true, suggestedTool: 'searchStays', confidence: 'high' };
        }
    }
    // Taxi keywords → dispatchTaxi
    var taxiPatterns = [
        /\b(taxi|cab|ride|pickup|pick up|drop off|transfer)\b/,
        /\b(airport|take me to|drive me|need a ride)\b/,
    ];
    for (var _a = 0, taxiPatterns_1 = taxiPatterns; _a < taxiPatterns_1.length; _a++) {
        var pattern = taxiPatterns_1[_a];
        if (pattern.test(lower)) {
            return { requiresTool: true, suggestedTool: 'dispatchTaxi', confidence: 'high' };
        }
    }
    // Service keywords → requestService
    var servicePatterns = [
        /\b(plumber|electrician|ac|air conditioning|repair|fix)\b/,
        /\b(technician|handyman|maintenance|broken)\b/,
    ];
    for (var _b = 0, servicePatterns_1 = servicePatterns; _b < servicePatterns_1.length; _b++) {
        var pattern = servicePatterns_1[_b];
        if (pattern.test(lower)) {
            return { requiresTool: true, suggestedTool: 'requestService', confidence: 'high' };
        }
    }
    // Restaurant/Places keywords → searchLocalPlaces
    var placePatterns = [
        /\b(restaurant|restaurants|cafe|coffee|bar|beach|club)\b/,
        /\b(food|eat|dining|lunch|dinner|breakfast)\b/,
        /\bwhere can i (eat|go|find)\b/,
    ];
    for (var _c = 0, placePatterns_1 = placePatterns; _c < placePatterns_1.length; _c++) {
        var pattern = placePatterns_1[_c];
        if (pattern.test(lower)) {
            return { requiresTool: true, suggestedTool: 'searchLocalPlaces', confidence: 'high' };
        }
    }
    return { requiresTool: false, suggestedTool: null, confidence: 'low' };
}
/**
 * Repair prompt to force tool calling on retry.
 * Appended to user message when first attempt fails.
 */
var REPAIR_PROMPT = "\nCRITICAL INSTRUCTION: You MUST call a tool NOW.\n\nDo NOT respond with text. You MUST use one of your available tools.\nIf you need to search for properties/rentals \u2192 call searchStays\nIf you need to find restaurants/places \u2192 call searchLocalPlaces\nIf user needs a taxi \u2192 call dispatchTaxi\n\nUse sensible defaults for any missing parameters (e.g., location=\"North Cyprus\").\n\nCALL THE TOOL NOW.\n";
var handleChatMessage = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, message, agentId, language, clientSessionId, user, userLocation, cleanMessage, locationMatch, sessionId, _b, history_1, userMemory, userDoc, liteContext, userData, userName, persona, locErr_1, lastLocation, effectiveLocation, pendingAction, normalizedMessage, isYes, isNo, EXPIRY_BUFFER_MS, timeRemaining, isExpiredLocally, idempotencyKey, confirmResult, confirmText, idempotencyKey, cancelText, reminderText, now, timeString, memoryContext, liteFacts, liteProbe, liteContextBlock, locationContext, contextPrompt, modelName, toolNames, model, validHistory, chat, result, response, listings, booking, payment, viewingRequest, mapLocation, taxiRequestId, functionCalls, detectedIntent, repairMessage, thinking, functionResponseParts, _i, functionCalls_1, call, fnName, fnArgs, toolResult, resolver, items, simplifiedItems, itemId, businessResult, holdResult, res_1, res_2, enrichedArgs, locationForTaxi, resolver, resolver, _c, toolErr_1, errorMessage, text, candidate, modelMessageMeta, responseData, error_1;
    var _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                logger.debug("🟦 [Backend] Received chat request");
                _a = req.body, message = _a.message, agentId = _a.agentId, language = _a.language, clientSessionId = _a.sessionId;
                user = req.user;
                _g.label = 1;
            case 1:
                _g.trys.push([1, 80, , 81]);
                userLocation = null;
                cleanMessage = message;
                locationMatch = message.match(/\[SHARED LOCATION:\s*([\d.]+),\s*([\d.]+)\]/);
                if (locationMatch) {
                    userLocation = {
                        lat: parseFloat(locationMatch[1]),
                        lng: parseFloat(locationMatch[2]),
                    };
                    // Replace the location tag with a cleaner message
                    cleanMessage =
                        message.replace(locationMatch[0], "").trim() ||
                            "User shared their current location";
                    logger.debug("📍 [Backend] User location extracted:", userLocation);
                }
                return [4 /*yield*/, chat_repository_1.chatRepository.getOrCreateSession(clientSessionId, user.uid, agentId)];
            case 2:
                sessionId = _g.sent();
                return [4 /*yield*/, Promise.all([
                        chat_repository_1.chatRepository.getHistory(sessionId, 10), // Load last 10 turns
                        memory_service_1.memoryService.getContext(user.uid, agentId),
                        firebase_1.db.collection("users").doc(user.uid).get(),
                        (0, user_service_1.getLiteContext)(user.uid),
                    ])];
            case 3:
                _b = _g.sent(), history_1 = _b[0], userMemory = _b[1], userDoc = _b[2], liteContext = _b[3];
                userData = userDoc.data() || {};
                userName = userData.displayName || user.email || user.uid || "Guest";
                persona = userData.persona || userData.type || liteContext.role || "user";
                if (!userLocation) return [3 /*break*/, 7];
                _g.label = 4;
            case 4:
                _g.trys.push([4, 6, , 7]);
                return [4 /*yield*/, firebase_1.db
                        .collection("users")
                        .doc(user.uid)
                        .set({
                        lastLocation: {
                            lat: userLocation.lat,
                            lng: userLocation.lng,
                            updatedAt: new Date().toISOString(),
                        },
                    }, { merge: true })];
            case 5:
                _g.sent();
                return [3 /*break*/, 7];
            case 6:
                locErr_1 = _g.sent();
                console.error("⚠️ [Backend] Failed to persist lastLocation:", (0, errors_1.getErrorMessage)(locErr_1) || locErr_1);
                return [3 /*break*/, 7];
            case 7:
                lastLocation = userData.lastLocation;
                effectiveLocation = userLocation || lastLocation || null;
                return [4 /*yield*/, chat_repository_1.chatRepository.getPendingAction(sessionId, user.uid)];
            case 8:
                pendingAction = _g.sent();
                if (!pendingAction) return [3 /*break*/, 30];
                normalizedMessage = cleanMessage.toLowerCase().trim();
                isYes = [
                    "yes",
                    "y",
                    "confirm",
                    "ok",
                    "okay",
                    "yep",
                    "sure",
                    "evet",
                ].includes(normalizedMessage);
                isNo = [
                    "no",
                    "n",
                    "cancel",
                    "stop",
                    "nevermind",
                    "hayır",
                    "iptal",
                ].includes(normalizedMessage);
                EXPIRY_BUFFER_MS = 30 * 1000;
                timeRemaining = pendingAction.holdExpiresAt.getTime() - Date.now();
                isExpiredLocally = timeRemaining < EXPIRY_BUFFER_MS;
                if (!isYes) return [3 /*break*/, 18];
                if (!(pendingAction.kind !== "confirm_transaction" ||
                    !pendingAction.txId ||
                    !pendingAction.businessId)) return [3 /*break*/, 9];
                return [3 /*break*/, 18];
            case 9:
                idempotencyKey = "confirm:".concat(pendingAction.txId, ":").concat(user.uid);
                return [4 /*yield*/, transaction_repository_1.transactionRepository.confirmTransaction({
                        transactionId: pendingAction.txId,
                        businessId: pendingAction.businessId,
                        actorType: "user",
                        actorId: user.uid,
                    }, idempotencyKey)];
            case 10:
                confirmResult = _g.sent();
                return [4 /*yield*/, chat_repository_1.chatRepository.clearPendingAction(sessionId)];
            case 11:
                _g.sent();
                if (!!confirmResult.success) return [3 /*break*/, 15];
                if (!(confirmResult.errorCode === "HOLD_EXPIRED")) return [3 /*break*/, 14];
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], { userId: user.uid, agentId: agentId })];
            case 12:
                _g.sent();
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "model", [
                        {
                            text: "That reservation expired. Would you like me to try booking again?",
                        },
                    ], { userId: user.uid, agentId: agentId })];
            case 13:
                _g.sent();
                res.json({
                    text: "⏰ That reservation expired. Would you like me to try booking again?",
                    sessionId: sessionId,
                    expired: true,
                });
                return [2 /*return*/];
            case 14:
                res.json({
                    text: "Unable to confirm: ".concat(confirmResult.error),
                    sessionId: sessionId,
                    error: true,
                });
                return [2 /*return*/];
            case 15: return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], { userId: user.uid, agentId: agentId })];
            case 16:
                _g.sent();
                confirmText = "\u2705 Confirmed! Your confirmation code is **".concat(confirmResult.confirmationCode, "**. You'll receive a message shortly.");
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "model", [{ text: confirmText }], { userId: user.uid, agentId: agentId })];
            case 17:
                _g.sent();
                res.json({
                    text: confirmText,
                    sessionId: sessionId,
                    booking: {
                        transactionId: pendingAction.txId,
                        confirmationCode: confirmResult.confirmationCode,
                    },
                });
                return [2 /*return*/];
            case 18:
                if (!isNo) return [3 /*break*/, 25];
                if (!(pendingAction.kind === "confirm_transaction" &&
                    pendingAction.txId &&
                    pendingAction.businessId)) return [3 /*break*/, 23];
                idempotencyKey = "release:".concat(pendingAction.txId, ":").concat(user.uid);
                return [4 /*yield*/, transaction_repository_1.transactionRepository.releaseHold(pendingAction.businessId, pendingAction.txId, "User cancelled", idempotencyKey)];
            case 19:
                _g.sent();
                return [4 /*yield*/, chat_repository_1.chatRepository.clearPendingAction(sessionId)];
            case 20:
                _g.sent();
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], { userId: user.uid, agentId: agentId })];
            case 21:
                _g.sent();
                cancelText = "Okay, I've cancelled that reservation. Is there anything else I can help you with?";
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "model", [{ text: cancelText }], { userId: user.uid, agentId: agentId })];
            case 22:
                _g.sent();
                res.json({
                    text: cancelText,
                    sessionId: sessionId,
                    cancelled: true,
                });
                return [2 /*return*/];
            case 23: 
            // Non-transaction kinds: clear and let orchestrator handle
            return [4 /*yield*/, chat_repository_1.chatRepository.clearPendingAction(sessionId)];
            case 24:
                // Non-transaction kinds: clear and let orchestrator handle
                _g.sent();
                _g.label = 25;
            case 25:
                if (!isExpiredLocally) return [3 /*break*/, 27];
                return [4 /*yield*/, chat_repository_1.chatRepository.clearPendingAction(sessionId)];
            case 26:
                _g.sent();
                return [3 /*break*/, 30];
            case 27: return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], { userId: user.uid, agentId: agentId })];
            case 28:
                _g.sent();
                reminderText = "I'm still waiting for your confirmation:\n\n> ".concat(pendingAction.summary, "\n\nPlease reply **YES** to confirm or **NO** to cancel.");
                return [4 /*yield*/, chat_repository_1.chatRepository.saveMessage(sessionId, "model", [{ text: reminderText }], { userId: user.uid, agentId: agentId })];
            case 29:
                _g.sent();
                res.json({
                    text: reminderText,
                    sessionId: sessionId,
                    awaitingConfirmation: true,
                });
                return [2 /*return*/];
            case 30:
                now = new Date();
                timeString = now.toLocaleDateString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                memoryContext = "\n            [USER LONG-TERM MEMORY]\n            - Preferences: ".concat(JSON.stringify(userMemory), "\n        ");
                liteFacts = liteContext.facts && liteContext.facts.length > 0
                    ? liteContext.facts.join("; ")
                    : "None";
                liteProbe = ((_d = liteContext.missing) === null || _d === void 0 ? void 0 : _d.length)
                    ? "We are missing: ".concat(liteContext.missing.join(", "))
                    : "Profile complete.";
                liteContextBlock = "\n            [USER PROFILE LITE]\n            - Facts: ".concat(liteFacts, "\n            - Missing Info: ").concat(liteProbe, "\n            - Persona/Role: ").concat(persona, "\n        ");
                locationContext = effectiveLocation
                    ? "\n            [USER CURRENT LOCATION]\n            - GPS Coordinates: ".concat(effectiveLocation.lat, ", ").concat(effectiveLocation.lng, "\n            - When dispatching taxis or providing navigation, use pickupLat=").concat(effectiveLocation.lat, " and pickupLng=").concat(effectiveLocation.lng, "\n            - User's pickup location is \"Current location\" with these exact coordinates\n        ")
                    : "";
                contextPrompt = "\n            ".concat((0, systemPrompts_1.getSystemInstruction)(agentId, language), "\n\n            [SYSTEM INFO]\n            Current Local Time: ").concat(timeString, "\n            User Name: ").concat(userName, "\n            User UID: ").concat(user.uid, "\n\n            ").concat(memoryContext, "\n            ").concat(liteContextBlock, "\n            ").concat(locationContext, "\n\n            [INSTRUCTIONS]\n            - Use the conversation history to understand context.\n            - If the user says \"book it\", refer to the last item discussed in history.\n            - Use the user's name (").concat(userName, ") naturally for a more personal tone when appropriate.\n            - If user is already on-island / mobile / has_car / declined pickup, do not upsell airport pickup. Prefer in-island services instead.\n            - Be date-aware: convert vague ranges like \"next week Thursday to the following Friday\" to concrete dates using current time (").concat(timeString, "). Avoid re-asking if you can compute dates.\n\n            [CRITICAL - TAXI TOOL USAGE]\n            - When you have BOTH a pickup location AND a destination, you MUST call the dispatchTaxi function\n            - DO NOT say \"I'm dispatching a taxi\" or \"I'll send a taxi\" - ACTUALLY CALL THE TOOL\n            - DO NOT respond with text when you should call dispatchTaxi\n            - ALWAYS use function calls instead of describing what you're doing\n            - If pickup location is \"Current location\" or user shared location, use the coordinates provided below\n\n            [LOCATION HANDLING - CRITICAL]\n            - NEVER ask users for \"latitude\", \"longitude\", \"GPS coordinates\", or any technical location data\n            - ALWAYS ask for locations naturally: \"Where are you?\" or \"Which hotel/area are you near?\" or \"What's your destination?\"\n            - Accept ANY human-readable location: hotel names, landmarks, neighborhoods, addresses, or \"current location\"\n            - The mobile app automatically provides GPS coordinates in the background - you only need the place name\n            - Examples of good questions: \"Which hotel are you staying at?\", \"Where would you like to go?\", \"What area are you in?\"\n            ").concat(userLocation ? "- IMPORTANT: User has shared their current location (".concat(userLocation.lat, ", ").concat(userLocation.lng, "). When calling dispatchTaxi, include pickupLat and pickupLng with these exact values.") : "", "\n        ");
                logger.debug("🟦 [Backend] Initializing Gemini...");
                modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
                logger.debug("\uD83E\uDD16 Using model: ".concat(modelName));
                logger.debug("\uD83D\uDCDD Raw env GEMINI_MODEL: ".concat(process.env.GEMINI_MODEL));
                toolNames = tools_1.ALL_TOOL_DEFINITIONS.map(function (t) { return t.name; });
                logger.info("\uD83D\uDD27 [DEBUG] Tool definitions (".concat(toolNames.length, "): ").concat(toolNames.join(', ')));
                if (toolNames.includes('searchMarketplace')) {
                    logger.error("\uD83D\uDEA8 [CRITICAL] searchMarketplace is STILL in tool definitions!");
                }
                model = getGenAI().getGenerativeModel({
                    model: modelName,
                    systemInstruction: contextPrompt,
                    tools: [{ functionDeclarations: tools_1.ALL_TOOL_DEFINITIONS }],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: generative_ai_1.FunctionCallingMode.ANY, // FORCE model to always call a function
                        },
                    },
                }, { apiVersion: "v1beta" });
                validHistory = history_1.map(function (h) { return ({
                    role: h.role,
                    parts: h.parts,
                }); });
                if (validHistory.length > 0 && validHistory[0].role !== "user") {
                    validHistory = validHistory.slice(1);
                }
                chat = model.startChat({
                    history: validHistory,
                });
                logger.debug("🟦 [Backend] Sending message to Gemini:", cleanMessage);
                return [4 /*yield*/, chat.sendMessage(cleanMessage)];
            case 31:
                result = _g.sent();
                return [4 /*yield*/, result.response];
            case 32:
                response = _g.sent();
                listings = [];
                booking = null;
                payment = null;
                viewingRequest = null;
                mapLocation = null;
                taxiRequestId = null;
                functionCalls = response.functionCalls();
                detectedIntent = detectActionIntent(cleanMessage);
                if (!(detectedIntent.requiresTool && (!functionCalls || functionCalls.length === 0))) return [3 /*break*/, 35];
                logger.warn("\u26A0\uFE0F [Enforcement] Tool required but none called. Intent: ".concat(detectedIntent.suggestedTool, " (").concat(detectedIntent.confidence, "). Retrying..."));
                repairMessage = "".concat(cleanMessage, "\n\n").concat(REPAIR_PROMPT, "\nSuggested tool to use: ").concat(detectedIntent.suggestedTool);
                return [4 /*yield*/, chat.sendMessage(repairMessage)];
            case 33:
                result = _g.sent();
                return [4 /*yield*/, result.response];
            case 34:
                response = _g.sent();
                functionCalls = response.functionCalls();
                if (functionCalls && functionCalls.length > 0) {
                    logger.info("\u2705 [Enforcement] Retry successful - tool called: ".concat(functionCalls[0].name));
                }
                else {
                    logger.warn("\u274C [Enforcement] Retry failed - no tool called. Falling back to text response.");
                }
                _g.label = 35;
            case 35:
                if (!(functionCalls && functionCalls.length > 0)) return [3 /*break*/, 78];
                // Log "Thinking" if there is text accompanying the tool call
                try {
                    thinking = response.text();
                    if (thinking) {
                        logger.debug("🧠 [Backend] Agent Thinking:", thinking);
                    }
                }
                catch (e) {
                    // Ignore if no text is present with the function call
                }
                functionResponseParts = [];
                _i = 0, functionCalls_1 = functionCalls;
                _g.label = 36;
            case 36:
                if (!(_i < functionCalls_1.length)) return [3 /*break*/, 75];
                call = functionCalls_1[_i];
                fnName = call.name;
                fnArgs = call.args;
                logger.debug("\uD83D\uDEE0\uFE0F [Backend] Decision: calling tool '".concat(fnName, "' with args ").concat(JSON.stringify(fnArgs)));
                toolResult = {};
                _g.label = 37;
            case 37:
                _g.trys.push([37, 72, , 73]);
                if (!
                // NOTE: searchMarketplace REMOVED - deprecated
                (fnName === "searchLocalPlaces" ||
                    fnName === "searchEvents" ||
                    fnName === "searchStays" ||
                    fnName === "searchHousingListings")) 
                // NOTE: searchMarketplace REMOVED - deprecated
                return [3 /*break*/, 39];
                resolver = tool_service_1.toolResolvers[fnName];
                return [4 /*yield*/, resolver(__assign({}, fnArgs))];
            case 38:
                items = _g.sent();
                listings = items || []; // Store for frontend
                simplifiedItems = (items || []).map(function (i) { return ({
                    id: i.id,
                    title: i.title,
                    price: i.price,
                    location: i.location,
                    amenities: i.amenities || i.features,
                }); });
                toolResult = {
                    results: simplifiedItems,
                    count: simplifiedItems.length,
                };
                return [3 /*break*/, 71];
            case 39:
                if (!(fnName === "initiateBooking")) return [3 /*break*/, 46];
                itemId = fnArgs.itemId;
                return [4 /*yield*/, (0, booking_ledger_tools_1.resolveBusinessId)(itemId)];
            case 40:
                businessResult = _g.sent();
                if (!!businessResult.success) return [3 /*break*/, 41];
                toolResult = {
                    success: false,
                    error: businessResult.error,
                    errorCode: businessResult.errorCode,
                };
                return [3 /*break*/, 45];
            case 41: return [4 /*yield*/, (0, booking_ledger_tools_1.createHeldBooking)({
                    businessId: businessResult.businessId,
                    offeringId: itemId,
                    offeringName: fnArgs.itemTitle || "Booking",
                    channel: "app_chat",
                    actor: { userId: user.uid, name: userName },
                    date: fnArgs.date ||
                        fnArgs.checkInDate ||
                        new Date().toISOString().split("T")[0],
                    time: fnArgs.time || "12:00",
                    partySize: fnArgs.guests || 1,
                    notes: fnArgs.specialRequests,
                    idempotencyKey: "booking:".concat(sessionId, ":").concat(itemId, ":").concat(fnArgs.date || "now"),
                })];
            case 42:
                holdResult = _g.sent();
                if (!!holdResult.success) return [3 /*break*/, 43];
                toolResult = {
                    success: false,
                    error: holdResult.error,
                    unavailable: holdResult.errorCode === "RESOURCE_UNAVAILABLE",
                };
                return [3 /*break*/, 45];
            case 43: 
            // Store pending action for confirmation gate
            return [4 /*yield*/, chat_repository_1.chatRepository.setPendingAction(sessionId, holdResult.pendingAction)];
            case 44:
                // Store pending action for confirmation gate
                _g.sent();
                booking = {
                    transactionId: holdResult.txId,
                    awaitingConfirmation: true,
                    holdExpiresAt: holdResult.holdExpiresAt,
                };
                toolResult = {
                    success: true,
                    awaitingConfirmation: true,
                    confirmationPrompt: holdResult.confirmationPrompt,
                };
                _g.label = 45;
            case 45: return [3 /*break*/, 71];
            case 46:
                if (!(fnName === "createPaymentIntent")) return [3 /*break*/, 48];
                return [4 /*yield*/, tool_service_1.toolResolvers.createPaymentIntent(fnArgs, user.uid)];
            case 47:
                res_1 = _g.sent();
                payment = res_1.payment;
                toolResult = res_1;
                return [3 /*break*/, 71];
            case 48:
                if (!(fnName === "scheduleViewing")) return [3 /*break*/, 50];
                return [4 /*yield*/, tool_service_1.toolResolvers.scheduleViewing(fnArgs, user.uid)];
            case 49:
                res_2 = _g.sent();
                viewingRequest = res_2;
                toolResult = res_2;
                return [3 /*break*/, 71];
            case 50:
                if (!(fnName === "consultEncyclopedia")) return [3 /*break*/, 52];
                return [4 /*yield*/, tool_service_1.toolResolvers.consultEncyclopedia(fnArgs)];
            case 51:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 52:
                if (!(fnName === "getRealTimeInfo")) return [3 /*break*/, 54];
                return [4 /*yield*/, tool_service_1.toolResolvers.getRealTimeInfo(fnArgs)];
            case 53:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 54:
                if (!(fnName === "sendWhatsAppMessage")) return [3 /*break*/, 56];
                return [4 /*yield*/, tool_service_1.toolResolvers.sendWhatsAppMessage(fnArgs)];
            case 55:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 56:
                if (!(fnName === "dispatchTaxi" || fnName === "requestTaxi")) return [3 /*break*/, 58];
                enrichedArgs = __assign({}, fnArgs);
                locationForTaxi = effectiveLocation || userLocation;
                if (locationForTaxi &&
                    !enrichedArgs.pickupLat &&
                    !enrichedArgs.pickupLng) {
                    enrichedArgs.pickupLat = locationForTaxi.lat;
                    enrichedArgs.pickupLng = locationForTaxi.lng;
                    logger.debug("\uD83D\uDCCD [Backend] Auto-injected user location into ".concat(fnName, ":"), locationForTaxi);
                }
                // If pickupLocation is missing or too generic, label it clearly for the driver
                if (!enrichedArgs.pickupLocation ||
                    /^current location$/i.test(enrichedArgs.pickupLocation)) {
                    enrichedArgs.pickupLocation = "Current location (see map link)";
                }
                resolver = fnName === "dispatchTaxi"
                    ? tool_service_1.toolResolvers.dispatchTaxi
                    : tool_service_1.toolResolvers.requestTaxi;
                return [4 /*yield*/, resolver(enrichedArgs, user.uid, sessionId)];
            case 57:
                toolResult = _g.sent();
                // Capture requestId for frontend tracking
                if (toolResult.success && toolResult.requestId) {
                    taxiRequestId = toolResult.requestId;
                    logger.debug("\uD83D\uDE95 [Backend] Captured taxi requestId: ".concat(taxiRequestId));
                }
                return [3 /*break*/, 71];
            case 58:
                if (!(fnName === "orderHouseholdSupplies")) return [3 /*break*/, 60];
                return [4 /*yield*/, tool_service_1.toolResolvers.orderHouseholdSupplies(fnArgs, user.uid)];
            case 59:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 60:
                if (!(fnName === "requestService")) return [3 /*break*/, 62];
                return [4 /*yield*/, tool_service_1.toolResolvers.requestService(fnArgs, user.uid)];
            case 61:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 62:
                if (!(fnName === "createConsumerRequest")) return [3 /*break*/, 64];
                return [4 /*yield*/, tool_service_1.toolResolvers.createConsumerRequest(fnArgs)];
            case 63:
                toolResult = _g.sent();
                return [3 /*break*/, 71];
            case 64:
                if (!(fnName === "showMap")) return [3 /*break*/, 66];
                return [4 /*yield*/, tool_service_1.toolResolvers.showMap(fnArgs)];
            case 65:
                toolResult = _g.sent();
                // Store map location for frontend response
                mapLocation = toolResult;
                return [3 /*break*/, 71];
            case 66:
                resolver = tool_service_1.toolResolvers[fnName];
                if (!resolver) {
                    throw new Error("Tool not implemented: ".concat(fnName));
                }
                if (!(resolver.length >= 2)) return [3 /*break*/, 68];
                return [4 /*yield*/, resolver(fnArgs, user.uid)];
            case 67:
                _c = _g.sent();
                return [3 /*break*/, 70];
            case 68: return [4 /*yield*/, resolver(fnArgs)];
            case 69:
                _c = _g.sent();
                _g.label = 70;
            case 70:
                // Pass user uid when resolver expects it (second argument)
                toolResult = _c;
                _g.label = 71;
            case 71:
                logger.debug("   Result:", JSON.stringify(toolResult).substring(0, 200) +
                    (JSON.stringify(toolResult).length > 200 ? "..." : ""));
                return [3 /*break*/, 73];
            case 72:
                toolErr_1 = _g.sent();
                errorMessage = (0, errors_1.getErrorMessage)(toolErr_1) || "Unknown error occurred";
                console.error("\uD83D\uDD34 [Backend] AI Controller Error: ".concat(errorMessage));
                if (toolErr_1 instanceof Error && toolErr_1.stack) {
                    console.error("\uD83D\uDD34 [Backend] Error stack:", toolErr_1.stack);
                }
                // Return error details to the AI agent so it can handle it gracefully
                toolResult = {
                    error: true,
                    message: errorMessage,
                    toolName: fnName,
                };
                return [3 /*break*/, 73];
            case 73:
                functionResponseParts.push({
                    functionResponse: {
                        name: fnName,
                        response: toolResult,
                    },
                });
                _g.label = 74;
            case 74:
                _i++;
                return [3 /*break*/, 36];
            case 75:
                // Send tool outputs back to Gemini
                logger.debug("🟦 [Backend] Sending tool outputs back to Gemini...");
                return [4 /*yield*/, chat.sendMessage(functionResponseParts)];
            case 76:
                result = _g.sent();
                return [4 /*yield*/, result.response];
            case 77:
                response = _g.sent();
                functionCalls = response.functionCalls();
                return [3 /*break*/, 35];
            case 78:
                if (!functionCalls || functionCalls.length === 0) {
                    console.warn("⚠️ [Backend] No tool calls returned for this turn.");
                }
                text = "";
                try {
                    text = response.text();
                    logger.debug("🟢 [Backend] Final Gemini response:", text);
                }
                catch (textError) {
                    console.error("⚠️ [Backend] Error getting response text:", (0, errors_1.getErrorMessage)(textError));
                    // Log raw response for debugging
                    logger.debug("🔍 [Backend] Raw response candidates:", JSON.stringify({
                        candidates: (_e = response.candidates) === null || _e === void 0 ? void 0 : _e.map(function (c) { return ({
                            finishReason: c.finishReason,
                            safetyRatings: c.safetyRatings,
                            content: c.content,
                        }); }),
                    }, null, 2));
                    candidate = (_f = response.candidates) === null || _f === void 0 ? void 0 : _f[0];
                    if ((candidate === null || candidate === void 0 ? void 0 : candidate.finishReason) === "SAFETY") {
                        text =
                            "I apologize, but I cannot process that request due to safety filters. Could you rephrase your question?";
                    }
                    else if ((candidate === null || candidate === void 0 ? void 0 : candidate.finishReason) === "RECITATION") {
                        text =
                            "I apologize, but I cannot provide that specific information. Let me help you in a different way.";
                    }
                    else if (!text || text.trim() === "") {
                        // Empty response - this might be a model issue
                        text = "I understand. Let me search for available options for you.";
                        console.warn("⚠️ [Backend] Empty response detected, providing fallback message");
                    }
                }
                // If still empty after all checks, provide a default response
                if (!text || text.trim() === "") {
                    text = "I've processed your request. How else can I help you?";
                    console.warn("⚠️ [Backend] Final fallback used for empty response");
                }
                modelMessageMeta = { userId: user.uid, agentId: agentId };
                // Add taxi requestId to metadata for frontend tracking
                if (taxiRequestId) {
                    modelMessageMeta.taxiRequestId = taxiRequestId;
                }
                return [4 /*yield*/, Promise.all([
                        chat_repository_1.chatRepository.saveMessage(sessionId, "user", [{ text: cleanMessage }], {
                            userId: user.uid,
                            agentId: agentId,
                        }),
                        chat_repository_1.chatRepository.saveMessage(sessionId, "model", [{ text: text }], modelMessageMeta),
                    ])];
            case 79:
                _g.sent();
                logger.debug("📤 [Backend] Sending response. Has mapLocation?", !!mapLocation, mapLocation);
                responseData = {
                    text: text,
                    listings: listings,
                    booking: booking,
                    payment: payment,
                    viewingRequest: viewingRequest,
                    mapLocation: mapLocation,
                    sessionId: sessionId,
                };
                res.json(responseData);
                return [3 /*break*/, 81];
            case 80:
                error_1 = _g.sent();
                console.error("🔴 [Backend] AI Controller Error:", error_1);
                console.error("🔴 [Backend] Error stack:", error_1.stack);
                res.status(500).send("Internal Server Error");
                return [3 /*break*/, 81];
            case 81: return [2 /*return*/];
        }
    });
}); };
exports.handleChatMessage = handleChatMessage;
var reindexListings = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, upsertListing, initializeCollection, initializeUserCollection, listingRepository, domainFilter, allItems, count, _i, allItems_1, item, itemAny, searchRecord, error_2;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 8, , 9]);
                logger.debug("🔄 [Reindex] Starting manual reindex...");
                _a = require("../services/typesense.service"), upsertListing = _a.upsertListing, initializeCollection = _a.initializeCollection, initializeUserCollection = _a.initializeUserCollection;
                listingRepository = require("../repositories/listing.repository").listingRepository;
                return [4 /*yield*/, initializeCollection()];
            case 1:
                _f.sent();
                return [4 /*yield*/, initializeUserCollection()];
            case 2:
                _f.sent();
                domainFilter = typeof req.query.domain === "string" ? req.query.domain : undefined;
                logger.debug("[Reindex] Domain filter: ".concat(domainFilter || "ALL"));
                return [4 /*yield*/, listingRepository.getAllActive(domainFilter ? { domain: domainFilter } : undefined)];
            case 3:
                allItems = _f.sent();
                logger.debug("\uD83D\uDD04 [Reindex] Found ".concat(allItems.length, " items in Firestore."));
                count = 0;
                _i = 0, allItems_1 = allItems;
                _f.label = 4;
            case 4:
                if (!(_i < allItems_1.length)) return [3 /*break*/, 7];
                item = allItems_1[_i];
                itemAny = item;
                searchRecord = {
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    price: item.price,
                    domain: item.domain,
                    category: itemAny.category,
                    subCategory: itemAny.subCategory ||
                        itemAny.rentalType ||
                        itemAny.type ||
                        (itemAny.domain === "Cars" &&
                            ((_b = itemAny.category) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === "rental"
                            ? "rental"
                            : null), // Fallback for legacy data
                    location: item.location,
                    type: itemAny.type || itemAny.rentalType,
                    rating: item.rating,
                    ownerId: itemAny.ownerUid || "system",
                    metadata: {
                        amenities: itemAny.amenities,
                        imageUrl: item.imageUrl,
                        bedrooms: itemAny.bedrooms || ((_c = itemAny.metadata) === null || _c === void 0 ? void 0 : _c.bedrooms),
                        bathrooms: itemAny.bathrooms || ((_d = itemAny.metadata) === null || _d === void 0 ? void 0 : _d.bathrooms),
                        area: itemAny.squareMeters || itemAny.area || ((_e = itemAny.metadata) === null || _e === void 0 ? void 0 : _e.area),
                    },
                    createdAt: Math.floor(Date.now() / 1000),
                };
                return [4 /*yield*/, upsertListing(searchRecord)];
            case 5:
                _f.sent();
                count++;
                _f.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7:
                logger.debug("\u2705 [Reindex] Successfully indexed ".concat(count, " items."));
                res.json({ success: true, count: count });
                return [3 /*break*/, 9];
            case 8:
                error_2 = _f.sent();
                console.error("🔴 [Reindex] Error:", error_2);
                res.status(500).send("Reindex Failed");
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.reindexListings = reindexListings;
