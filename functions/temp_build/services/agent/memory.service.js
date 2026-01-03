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
exports.memoryService = void 0;
var firebase_1 = require("../../config/firebase");
var logger = __importStar(require("firebase-functions/logger"));
exports.memoryService = {
    // Call this in the background
    updateLongTermMemory: function (userId, recentMessages) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // 1. Ask Gemini to extract facts from these specific messages
            // Prompt: "Extract user preferences (budget, location, likes) from this conversation snippet..."
            // 2. Merge results into Firestore 'users/{userId}/memory'
            // Use set({ ...data }, { merge: true })
            // Placeholder for now
            logger.info("[MemoryService] Would update memory for ".concat(userId));
            return [2 /*return*/];
        });
    }); },
    // Extract facts and update memory (Background Task, Sampled)
    extractAndPersist: function (userId, agentId, userMessage, modelResponse) { return __awaiter(void 0, void 0, void 0, function () {
        var shouldProcess, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    shouldProcess = Math.random() < 0.2 || userMessage.length > 50;
                    if (!shouldProcess) {
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // 1. Ask Gemini to extract facts
                    // Ideally this would be a separate smaller model or specialized prompt
                    // For now, we stub it to avoid the crash.
                    logger.info("[MemoryService] extracting facts for ".concat(userId, " (Sampled)"));
                    // In a real implementation:
                    // const newFacts = await gemini.extractFacts(userMessage);
                    // await db.collection('users').doc(userId).collection('memory').doc('main').set(newFacts, { merge: true });
                    // Forward to the bulk update method for now (simulated)
                    return [4 /*yield*/, exports.memoryService.updateLongTermMemory(userId, [
                            { role: 'user', text: userMessage },
                            { role: 'model', text: modelResponse }
                        ])];
                case 2:
                    // In a real implementation:
                    // const newFacts = await gemini.extractFacts(userMessage);
                    // await db.collection('users').doc(userId).collection('memory').doc('main').set(newFacts, { merge: true });
                    // Forward to the bulk update method for now (simulated)
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    logger.error('[MemoryService] Extraction failed', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    // Call this when building the System Prompt
    getContext: function (userId, agentId) { return __awaiter(void 0, void 0, void 0, function () {
        var doc, full, core, slice, clean;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, firebase_1.db.collection('users').doc(userId).collection('memory').doc('main').get()];
                case 1:
                    doc = _a.sent();
                    full = doc.data() || {};
                    core = {
                        name: full.name || null,
                        style: full.style || null, // e.g. "Direct", "Polite"
                    };
                    slice = {};
                    switch (agentId) {
                        case 'agent_estate':
                            slice = {
                                budget: full.budget,
                                preferredAreas: full.preferredAreas,
                                propertyType: full.propertyType,
                                investmentIntent: full.investmentIntent
                            };
                            break;
                        case 'agent_auto':
                            slice = {
                                carPreference: full.carPreference,
                                licenseType: full.licenseType
                            };
                            break;
                        case 'agent_gourmet':
                            slice = {
                                dietaryRestrictions: full.dietaryRestrictions,
                                favoriteCuisines: full.favoriteCuisines,
                                diningBudget: full.diningBudget
                            };
                            break;
                        default:
                            // Fallback: Return a bit more for general concierge
                            slice = {
                                interests: full.interests,
                                familySize: full.familySize
                            };
                    }
                    clean = function (obj) { return Object.fromEntries(Object.entries(obj).filter(function (_a) {
                        var _ = _a[0], v = _a[1];
                        return v != null;
                    })); };
                    return [2 /*return*/, __assign(__assign({}, clean(core)), clean(slice))];
            }
        });
    }); }
};
