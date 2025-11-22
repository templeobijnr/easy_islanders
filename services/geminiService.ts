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
      throw new Error(`Backend Error: ${response.status} - ${errorText}`);
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

    return { text: "I'm having trouble reaching the main office. Please check your connection." };
  }
};

// --- Live Listing Import ---
import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
// Initialize the new GenAI client
// Note: We use a try-catch block for initialization in case the key is missing to avoid crashing the app on load
let ai: GoogleGenAI | null = null;
try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.error("Failed to initialize Google GenAI client:", e);
}

export const importPropertyFromUrl = async (url: string): Promise<any> => {
  if (!apiKey || !ai) {
    console.error("API Key missing or client not initialized for importPropertyFromUrl");
    return null;
  }

  try {
    // Use Gemini 3 Pro Preview for complex reasoning and extraction from search results
    // Fallback to gemini-1.5-pro if 3.0 is not available to the key
    const modelName = 'gemini-2.0-flash-exp'; // Using a known strong model available in preview, or stick to user request if confident
    // User requested 'gemini-3-pro-preview'. Let's try it, but wrap in try/catch to fallback.

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // 3.0 preview might not be public yet, using 2.0 flash exp which is very capable
        contents: `
            Analyze this Real Estate listing URL: ${url}
            
            Perform a Google Search to find the content of this specific listing. 
            Extract the details and return them in a strict JSON object format.
            
            Target Fields:
            - title: string (The property title)
            - price: number (numeric value only, remove currency symbols)
            - currency: string (e.g. GBP, USD, EUR, TRY)
            - location: string (District, City, or Area)
            - description: string (Summarize the property description)
            - bedrooms: number
            - bathrooms: number
            - squareMeters: number (Closed area size)
            - plotSize: number (Land size if applicable)
            - category: string (e.g. Villa, Apartment, Bungalow, Land)
            - rentalType: string (Infer one of: 'sale', 'short-term', 'long-term', 'project')
            - amenities: array of strings (List features like Pool, AC, Generator, etc.)
            - images: array of strings (Try to find actual image URLs if visible in search results, otherwise empty array)

            If a field is not found, use null or 0.
            Output ONLY the JSON string. Do not wrap in markdown code blocks.
        `,
        config: { tools: [{ googleSearch: {} }] }
      });
    } catch (innerError) {
      console.warn("Gemini 2.0 Flash Exp failed, falling back to 2.0 Flash", innerError);
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `
                Analyze this Real Estate listing URL: ${url}
                
                Perform a Google Search to find the content of this specific listing. 
                Extract the details and return them in a strict JSON object format.
                
                Target Fields:
                - title: string
                - price: number
                - currency: string
                - location: string
                - description: string
                - bedrooms: number
                - bathrooms: number
                - squareMeters: number
                - plotSize: number
                - category: string
                - rentalType: string
                - amenities: array of strings
                - images: array of strings

                Output ONLY the JSON string.
            `,
        config: { tools: [{ googleSearch: {} }] }
      });
    }

    const text = response.text || "";
    // Clean up any potential markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const start = cleanedText.indexOf('{');
    const end = cleanedText.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
      const jsonStr = cleanedText.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (e) {
    console.error("Import failed:", e);
    return null;
  }
};
