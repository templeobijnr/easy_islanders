/**
 * Chat API Service
 * Connects mobile app to backend chat controller
 */

import auth from '@react-native-firebase/auth';

// Backend API base URL - update for production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
    'https://us-central1-merve-app-nc.cloudfunctions.net/api';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export interface ChatResponse {
    text: string;
    sessionId?: string;
    awaitingConfirmation?: boolean;
    pendingAction?: {
        kind: string;
        orderId?: string;
        requestId?: string;
        summary?: string;
    };
    booking?: {
        confirmationCode?: string;
        transactionId?: string;
    };
}

/**
 * Send chat message to backend Merve AI
 */
export async function sendChatMessage(
    message: string,
    sessionId?: string,
    location?: { lat: number; lng: number }
): Promise<ChatResponse> {
    try {
        // Get Firebase auth token
        const user = auth().currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const token = await user.getIdToken();

        // Send to backend chat controller
        const response = await fetch(`${API_BASE_URL}/v1/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                message,
                sessionId,
                agentId: 'merve',
                language: 'en',
                location,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ChatAPI] Error response:', response.status, errorText);
            throw new Error(`Chat API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            text: data.text || data.response || data.message || 'No response',
            sessionId: data.sessionId,
            awaitingConfirmation: data.awaitingConfirmation,
            pendingAction: data.pendingAction,
            booking: data.booking,
        };
    } catch (error) {
        console.error('[ChatAPI] Error sending message:', error);
        throw error;
    }
}

/**
 * Confirm a pending action (YES/NO response)
 */
export async function confirmAction(
    sessionId: string,
    confirmed: boolean = true
): Promise<ChatResponse> {
    const message = confirmed ? 'yes' : 'no';
    return sendChatMessage(message, sessionId);
}

/**
 * Get user's current location for context
 */
export async function sendMessageWithLocation(
    message: string,
    sessionId?: string
): Promise<ChatResponse> {
    // Location is handled by the discover screen's location service
    // Here we just pass through without location for now
    return sendChatMessage(message, sessionId);
}
