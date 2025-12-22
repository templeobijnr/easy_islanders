/**
 * Integration Service: Gemini (AI Chat)
 *
 * Responsibility:
 * - Send messages to backend chat API
 * - Import properties from URLs via backend
 *
 * External Dependencies:
 * - Backend /chat/message endpoint
 * - Backend /import/property endpoint
 *
 * Firestore Collections:
 * - None (communicates via backend API)
 *
 * Layer: Integration Service
 *
 * Dependencies:
 * - firebaseConfig (for auth token)
 *
 * Notes:
 * - All AI calls go through backend (secure)
 * - Includes 45s timeout for AI requests
 * - Safe to modify in isolation
 *
 * Stability: Core
 */

// src/services/integrations/gemini/gemini.client.ts
import { auth } from '../../firebaseConfig';
import { UnifiedItem } from '../../../types/marketplace';
import { Booking } from '../../../types/booking';
import { logger } from '../../../utils/logger';

const API_URL = import.meta.env.VITE_API_URL;

interface AgentResponse {
  text: string;
  listings?: UnifiedItem[];
  booking?: Booking;
  sessionId?: string;
  paymentRequest?: boolean;
  whatsappTriggered?: boolean;
  mapLocation?: {
    lat: number;
    lng: number;
    title: string;
  };
}

export const sendMessageToAgent = async (
  message: string,
  agentId: string,
  language: string
): Promise<AgentResponse> => {

  // 1. AUTH CHECK (Fail fast)
  logger.debug('🔵 [Chat] Starting request', { agentId, language, messageLength: message.length });
  let currentUser = auth.currentUser;

  // If no user immediately, wait briefly for Auth to initialize (handling page refreshes)
  if (!currentUser) {
    logger.debug('🔵 [Chat] Waiting for auth state to resolve...');
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        currentUser = user;
        unsubscribe();
        resolve();
      });
      // Timeout after 2 seconds to prevent hanging
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2000);
    });
  }

  logger.debug('🔵 [Chat] Auth resolved', { isLoggedIn: !!currentUser });

  if (!currentUser) {
    logger.error('🔴 [Chat] No user logged in');
    throw new Error('AUTH_REQUIRED');
  }

  const token = await currentUser.getIdToken();

  // 2. TIMEOUT CONTROLLER
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('AI request timed out', 'AbortError')),
    45000,
  ); // 45s limit for AI

  const apiUrl = `${API_URL}/chat/message`;
  logger.debug('🔵 [Chat] API URL', { apiUrl });

  try {
    logger.debug('🔵 [Chat] Sending request...');
    const storageKey = currentUser ? `chat_session_${currentUser.uid}` : 'chat_session_guest';
    const storedSessionId = localStorage.getItem(storageKey);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        agentId,
        language,
        sessionId: storedSessionId || undefined
      }),
      signal: controller.signal // Attach signal
    });

    clearTimeout(timeoutId); // Clear timer on success
    logger.debug('🟢 [Chat] Response status', { status: response.status });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('🔴 [Chat] Error response', { status: response.status, preview: errorText.slice(0, 200) });

      // Try to parse error as JSON for better error messages
      let errorMessage = "I'm having trouble reaching the main office. Please check your connection.";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message || errorJson.error) {
          errorMessage = `Sorry, there was an issue: ${errorJson.message || errorJson.error}`;
        }
      } catch {
        // If not JSON, use status-based messages
        if (response.status === 401 || response.status === 403) {
          errorMessage = "You need to be logged in to do that.";
        } else if (response.status === 404) {
          errorMessage = "The service you're looking for isn't available right now.";
        } else if (response.status >= 500) {
          errorMessage = "Our system is having a brief issue. Please try again in a moment.";
        }
      }

      return { text: errorMessage };
    }

    const data = await response.json();
    logger.debug('🟢 [Chat] Response received', {
      hasSessionId: !!data?.sessionId,
      listingsCount: Array.isArray(data?.listings) ? data.listings.length : 0,
    });

    if (data.sessionId) localStorage.setItem(storageKey, data.sessionId);

    return data;

  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // 3. BETTER ERROR MESSAGES
    if (error.name === 'AbortError') {
      return { text: "The agent is taking a little too long to think. The island wifi might be slow! Please try again." };
    }

    logger.error('🔴 [Chat] Error', { name: error?.name, message: error?.message });
    if (error.message === 'AUTH_REQUIRED') {
      throw error; // Re-throw to let UI handle login
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return { text: "I'm having trouble connecting. Please check your internet connection." };
    }

    // Generic fallback
    return { text: "Something unexpected happened. Please try again." };
  }
};

// ✅ SECURE: Property import now calls backend instead of using Gemini directly on client
export const importPropertyFromUrl = async (url: string): Promise<any> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    logger.error('❌ [Import] No user logged in');
    throw new Error('AUTH_REQUIRED');
  }

  const token = await currentUser.getIdToken();
  logger.debug('🔵 [Import] Importing property from URL', { urlLength: url.length });

  try {
    const response = await fetch(`${API_URL}/import/property`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('🔴 [Import] Error response', { status: response.status, preview: errorText.slice(0, 200) });
      throw new Error(`Import failed: ${response.status}`);
    }

    const data = await response.json();
    logger.debug('✅ [Import] Property imported successfully');
    return data;

  } catch (error) {
    logger.error('🔴 [Import] Failed', error);
    return null;
  }
};
