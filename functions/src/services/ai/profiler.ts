import * as logger from "firebase-functions/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserIntelligence } from "../../types/user";

let genAI: GoogleGenerativeAI | null = null;
const getGenAI = (): GoogleGenerativeAI | null => {
  if (genAI) return genAI;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  genAI = new GoogleGenerativeAI(key);
  return genAI;
};

export async function analyzeChatTurn(
  userId: string,
  lastMessage: string,
  currentGraph: UserIntelligence,
): Promise<UserIntelligence> {
  const client = getGenAI();
  if (!lastMessage || !client) return currentGraph;

  logger.debug(`[Profiler] Analyzing message for user ${userId}:`, lastMessage);
  logger.debug(
    `[Profiler] Current graph:`,
    JSON.stringify(currentGraph).substring(0, 400),
  );

  const model = client.getGenerativeModel(
    {
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      systemInstruction: `
        You are an expert profiler. Analyze the latest user message and update a user intelligence graph.
        Output strict JSON with: { attributes: {}, segments: [], missingData: [] }.
        Confidence rules: direct statement=1.0, implied=0.5-0.7, weak=0.1-0.3.
        Missing data keys to consider: BUDGET, TRANSPORT, ACCOMMODATION, LOCATION, TIMELINE.
        Do NOT include prose; JSON only.
        `,
    },
    { apiVersion: "v1beta" },
  );

  const prompt = `
    USER_ID: ${userId}
    CURRENT_GRAPH: ${JSON.stringify(currentGraph || {})}
    MESSAGE: "${lastMessage}"
    `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  logger.debug(
    `[Profiler] Raw model response (truncated):`,
    text.substring(0, 400),
  );
  let parsed: Partial<UserIntelligence> = {};
  try {
    parsed = JSON.parse(text);
    logger.debug(`[Profiler] Parsed JSON:`, parsed);
  } catch (err) {
    console.error(`[Profiler] Failed to parse model output`, err);
    return currentGraph;
  }

  const merged: UserIntelligence = {
    attributes: {
      ...(currentGraph?.attributes || {}),
      ...(parsed.attributes || {}),
    },
    segments: parsed.segments || currentGraph?.segments || [],
    missingData: parsed.missingData || currentGraph?.missingData || [],
  };

  return merged;
}
