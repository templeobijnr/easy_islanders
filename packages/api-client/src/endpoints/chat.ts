/**
 * Chat API Endpoints
 *
 * Wrapper for /chat/message endpoint.
 * Matches existing apps/web/src/services/geminiService.ts pattern.
 */

import type { HttpClient } from '../client';
import type { StorageAdapter } from '../storage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Response from chat message endpoint.
 * Matches AgentResponse in geminiService.ts
 */
export interface ChatResponse {
    text: string;
    listings?: unknown[];
    booking?: unknown;
    sessionId?: string;
    paymentRequest?: boolean;
    whatsappTriggered?: boolean;
    mapLocation?: {
        lat: number;
        lng: number;
        title: string;
    };
}

/**
 * Request body for sending a chat message.
 */
export interface SendMessageRequest {
    message: string;
    agentId?: string;
    language?: 'en' | 'tr' | 'ru';
    sessionId?: string;
}

// =============================================================================
// CHAT API
// =============================================================================

export class ChatApi {
    private static readonly SESSION_KEY_PREFIX = 'chat_session_';

    constructor(
        private readonly client: HttpClient,
        private readonly storage: StorageAdapter,
        private readonly userId?: string
    ) { }

    /**
     * Send a message to the Merve agent.
     *
     * @param message - User's message text
     * @param options - Optional agent ID and language
     */
    async sendMessage(
        message: string,
        options?: {
            agentId?: string;
            language?: 'en' | 'tr' | 'ru';
        }
    ): Promise<ChatResponse> {
        // Get existing session ID from storage
        const sessionKey = this.getSessionKey();
        const storedSessionId = await this.storage.getItem(sessionKey);

        const body: SendMessageRequest = {
            message,
            agentId: options?.agentId || 'merve',
            language: options?.language || 'en',
            sessionId: storedSessionId || undefined,
        };

        // Note: Chat uses /chat/message (not /v1/chat/message)
        // We need to handle this differently
        const response = await this.client.post<ChatResponse>(
            '../chat/message',
            body
        );

        // Store new session ID if provided
        if (response.data?.sessionId) {
            await this.storage.setItem(sessionKey, response.data.sessionId);
        }

        if (!response.success || !response.data) {
            throw new Error(response.error || 'Chat request failed');
        }

        return response.data;
    }

    /**
     * Clear the current chat session.
     */
    async clearSession(): Promise<void> {
        const sessionKey = this.getSessionKey();
        await this.storage.removeItem(sessionKey);
    }

    /**
     * Get the storage key for chat session.
     */
    private getSessionKey(): string {
        return `${ChatApi.SESSION_KEY_PREFIX}${this.userId || 'guest'}`;
    }
}
