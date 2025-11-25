// src/services/geminiService.ts
import { auth } from './firebaseConfig';
import { UnifiedItem } from '../types/marketplace';
import { Booking } from '../types/booking';

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

  console.log('🔵 [Chat] Starting request...', { message, agentId, language });

  // 1. AUTH CHECK (Fail fast)
  console.log('🔵 [Chat] Firebase auth object:', auth);
  console.log('🔵 [Chat] Firebase auth currentUser initially:', auth.currentUser);
  let currentUser = auth.currentUser;

  // If no user immediately, wait briefly for Auth to initialize (handling page refreshes)
  if (!currentUser) {
    console.log('🔵 [Chat] Waiting for Auth state to resolve...');
    await new Promise<void>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log('🔵 [Chat] onAuthStateChanged fired with user:', user ? user.uid : 'null');
        currentUser = user;
        unsubscribe();
        resolve();
      });
      // Timeout after 2 seconds to prevent hanging
      setTimeout(() => {
        console.log('🔵 [Chat] Auth state timeout reached, no user resolved');
        unsubscribe();
        resolve();
      }, 2000);
    });
  }

  console.log('🔵 [Chat] Final current user:', currentUser ? `${currentUser.uid} (${currentUser.email})` : 'NOT LOGGED IN');

  if (!currentUser) {
    console.error('🔴 [Chat] No user logged in!');
    throw new Error('AUTH_REQUIRED');
  }

  const token = await currentUser.getIdToken();
  console.log('🔵 [Chat] Token obtained:', token.substring(0, 20) + '...');

  // 2. TIMEOUT CONTROLLER
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s limit for AI

  const apiUrl = `${API_URL}/chat/message`;
  console.log('🔵 [Chat] API URL:', apiUrl);
  console.log('🔵 [Chat] Full API_URL env:', API_URL);

  try {
    console.log('🔵 [Chat] Sending request...');
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
    console.log('🟢 [Chat] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 [Chat] Error response:', errorText);

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
    console.log('🟢 [Chat] Response data:', data);

    if (data.sessionId) localStorage.setItem(storageKey, data.sessionId);

    return data;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("🔴 [Chat] Error:", error);
    console.error("🔴 [Chat] Error name:", error.name);
    console.error("🔴 [Chat] Error message:", error.message);

    // 3. BETTER ERROR MESSAGES
    if (error.name === 'AbortError') {
      return { text: "The agent is taking a little too long to think. The island wifi might be slow! Please try again." };
    }
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
    console.error('❌ [Import] No user logged in');
    throw new Error('AUTH_REQUIRED');
  }

  const token = await currentUser.getIdToken();
  console.log('🔵 [Import] Importing property from URL:', url);

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
      console.error('🔴 [Import] Error:', errorText);
      throw new Error(`Import failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [Import] Property imported successfully:', data);
    return data;

  } catch (error) {
    console.error("🔴 [Import] Failed:", error);
    return null;
  }
};
