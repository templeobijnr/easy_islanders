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
Object.defineProperty(exports, "__esModule", { value: true });
exports.waveAtUser = exports.getNearbyUsers = void 0;
const logger = __importStar(require("firebase-functions/logger"));
// Mock data for now until we have real users with coords
const MOCK_USERS = [
    {
        id: 'user_1',
        name: 'Elena K.',
        avatar: 'https://i.pravatar.cc/150?u=elena',
        rank: 'Explorer',
        points: 1250,
        coordinates: { lat: 35.3350, lng: 33.3250 }, // Near Kyrenia
        currentMood: 'Looking for coffee ☕',
        interests: ['Coffee', 'Photography'],
        trustScore: 95
    },
    {
        id: 'user_2',
        name: 'Marco P.',
        avatar: 'https://i.pravatar.cc/150?u=marco',
        rank: 'Local Legend',
        points: 5400,
        coordinates: { lat: 35.3320, lng: 33.3180 },
        currentMood: 'Showing tourists around 🏰',
        interests: ['History', 'Hiking'],
        trustScore: 99
    },
    {
        id: 'user_3',
        name: 'Sarah J.',
        avatar: 'https://i.pravatar.cc/150?u=sarah',
        rank: 'Islander',
        points: 800,
        coordinates: { lat: 35.3280, lng: 33.3220 },
        currentMood: 'Beach day! 🏖️',
        interests: ['Beach', 'Swimming'],
        trustScore: 88
    }
];
const getNearbyUsers = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        // In a real implementation, we would use a Geoquery (Geohash) on Firestore
        // or a spatial search on Typesense.
        // For now, we return mock users to demonstrate the UI.
        logger.info(`Fetching users near ${lat}, ${lng} within ${radius}m`);
        // Simulate network delay
        // await new Promise(resolve => setTimeout(resolve, 500));
        res.json({ users: MOCK_USERS });
    }
    catch (error) {
        logger.error('Error fetching nearby users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getNearbyUsers = getNearbyUsers;
const waveAtUser = async (req, res) => {
    var _a;
    try {
        const { targetUserId } = req.body;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid; // Assuming auth middleware populates this
        logger.info(`User ${currentUserId} waved at ${targetUserId}`);
        // Logic to create a notification or "Wave" record in Firestore
        // await db.collection('notifications').add({ ... });
        res.json({ success: true, message: 'Waved successfully! 👋' });
    }
    catch (error) {
        logger.error('Error waving at user:', error);
        res.status(500).json({ error: 'Failed to wave' });
    }
};
exports.waveAtUser = waveAtUser;
//# sourceMappingURL=user.controller.js.map