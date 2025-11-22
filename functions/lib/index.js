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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reindex = exports.stripeWebhook = exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app_1 = __importDefault(require("./app"));
const payment_service_1 = require("./services/payment.service");
// 1. The Main API (Express)
exports.api = (0, https_1.onRequest)({ region: "europe-west1", memory: "512MiB", cors: true }, app_1.default);
// 2. The Stripe Webhook (Raw Request Handler)
exports.stripeWebhook = (0, https_1.onRequest)({ region: "europe-west1", memory: "256MiB" }, async (req, res) => {
    const signature = req.headers['stripe-signature'];
    try {
        // In Cloud Functions, req.rawBody is available
        await payment_service_1.paymentService.handleWebhook(signature, req.rawBody);
        res.json({ received: true });
    }
    catch (err) {
        logger.error(err);
        res.status(400).send('Webhook Error');
    }
});
// 3. Database Triggers
__exportStar(require("./triggers/onListingWrite"), exports);
// 4. Manual Reindex Endpoint
const chat_controller_1 = require("./controllers/chat.controller");
exports.reindex = (0, https_1.onRequest)({ region: "europe-west1", memory: "512MiB" }, chat_controller_1.reindexListings);
//# sourceMappingURL=index.js.map