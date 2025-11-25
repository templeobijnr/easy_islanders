import { Request, Response } from 'express';
import * as logger from 'firebase-functions/logger';
// import { db } from '../config/firebase';
import { SocialUser } from '../types/domain'; // Assuming types are copied or shared

// Mock data for now until we have real users with coords
const MOCK_USERS: SocialUser[] = [
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

export const getNearbyUsers = async (req: Request, res: Response) => {
    try {
        const { lat, lng, radius } = req.query;

        // In a real implementation, we would use a Geoquery (Geohash) on Firestore
        // or a spatial search on Typesense.
        // For now, we return mock users to demonstrate the UI.

        logger.info(`Fetching users near ${lat}, ${lng} within ${radius}m`);

        // Simulate network delay
        // await new Promise(resolve => setTimeout(resolve, 500));

        res.json({ users: MOCK_USERS });
    } catch (error) {
        logger.error('Error fetching nearby users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const waveAtUser = async (req: Request, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user?.uid; // Assuming auth middleware populates this

        logger.info(`User ${currentUserId} waved at ${targetUserId}`);

        // Logic to create a notification or "Wave" record in Firestore
        // await db.collection('notifications').add({ ... });

        res.json({ success: true, message: 'Waved successfully! 👋' });
    } catch (error) {
        logger.error('Error waving at user:', error);
        res.status(500).json({ error: 'Failed to wave' });
    }
};
