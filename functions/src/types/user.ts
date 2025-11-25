import { Timestamp } from 'firebase-admin/firestore';

// Soft Intelligence Graph (stored in /users/{uid}/system/intelligence)
export interface UserIntelligence {
    attributes: {
        [key: string]: {
            value: string | number | boolean;
            confidence: number; // 0.0 to 1.0
            source: 'EXPLICIT' | 'INFERRED' | 'BEHAVIORAL';
            updatedAt: Timestamp;
        }
    };
    segments: string[];       // e.g. ["STUDENT", "GAMER"]
    missingData: string[];    // e.g. ["BUDGET", "TRANSPORT"]
}

// Lite Context passed to chat agent
export interface UserLiteContext {
    name: string;
    role: string;
    confirmed_interests: string[];
    missing_info_probe: string | null;
    facts?: string[];   // Back-compat for existing usage
    missing?: string[]; // Back-compat for existing usage
}
