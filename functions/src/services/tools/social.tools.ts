import * as logger from "firebase-functions/logger";
import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { asToolContext, UserIdOrToolContext } from "./toolContext";
import { getErrorMessage } from '../../utils/errors';

const now = FieldValue.serverTimestamp;

// ─────────────────────────────────────────────────────────────────────────────
// Typed Tool Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface CreateTribeArgs {
  name: string;
  description?: string;
  tags?: string[];
}

interface TribeIdArgs {
  tribeId: string;
}

interface PostToTribeArgs {
  tribeId: string;
  content: string;
  mediaUrl?: string;
}

interface ListTribeMessagesArgs {
  tribeId: string;
  limit?: number;
}

interface ListTrendingTribesArgs {
  limit?: number;
}

interface WaveUserArgs {
  targetUserId: string;
}

interface WaveIdArgs {
  waveId: string;
}

interface ListNearbyUsersArgs {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

interface CheckInArgs {
  placeId: string;
  placeName: string;
  location?: { lat: number; lng: number };
}

interface PlaceCheckInsArgs {
  placeId: string;
  limit?: number;
}

interface VibeMapArgs {
  area: string;
}

// Unified result type with proper index signature
interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

// User data shape from check-ins
interface CheckInUser {
  userId: string;
  placeId: string;
  placeName: string;
  location?: { lat: number; lng: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const socialTools = {
  // --- Tribes ---

  createTribe: async (args: CreateTribeArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      const id = db.collection("tribes").doc().id;
      const payload = {
        id,
        name: args.name,
        description: args.description || "",
        tags: args.tags || [],
        ownerId: userId,
        createdAt: now(),
      };
      await db.collection("tribes").doc(id).set(payload);
      return { success: true, tribe: payload };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  joinTribe: async (args: TribeIdArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      await db
        .collection("tribes")
        .doc(args.tribeId)
        .collection("members")
        .doc(userId)
        .set({ joinedAt: now() });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  leaveTribe: async (args: TribeIdArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      await db
        .collection("tribes")
        .doc(args.tribeId)
        .collection("members")
        .doc(userId)
        .delete();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  postToTribe: async (args: PostToTribeArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      const postId = db
        .collection("tribes")
        .doc(args.tribeId)
        .collection("posts")
        .doc().id;
      const payload = {
        id: postId,
        content: args.content,
        mediaUrl: args.mediaUrl || null,
        userId,
        createdAt: now(),
      };
      await db
        .collection("tribes")
        .doc(args.tribeId)
        .collection("posts")
        .doc(postId)
        .set(payload);
      return { success: true, post: payload };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  listTribeMessages: async (args: ListTribeMessagesArgs): Promise<ToolResult> => {
    try {
      const snap = await db
        .collection("tribes")
        .doc(args.tribeId)
        .collection("posts")
        .orderBy("createdAt", "desc")
        .limit(args.limit || 20)
        .get();
      return { success: true, messages: snap.docs.map((d) => d.data()) };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  getTribeInfo: async (args: TribeIdArgs): Promise<ToolResult> => {
    try {
      const snap = await db.collection("tribes").doc(args.tribeId).get();
      return { success: true, tribe: snap.exists ? snap.data() : null };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  listTrendingTribes: async (args: ListTrendingTribesArgs): Promise<ToolResult> => {
    try {
      // Approximate trending by recent posts count
      const snap = await db
        .collection("tribes")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
      return {
        success: true,
        tribes: snap.docs.slice(0, args.limit || 10).map((d) => d.data()),
      };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  // --- Waves ---

  waveUser: async (args: WaveUserArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      const waveId = db.collection("waves").doc().id;
      const payload = {
        id: waveId,
        from: userId,
        to: args.targetUserId,
        status: "pending",
        createdAt: now(),
      };
      await db.collection("waves").doc(waveId).set(payload);
      return { success: true, waveId };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  acceptWave: async (args: WaveIdArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      await db
        .collection("waves")
        .doc(args.waveId)
        .set({ status: "accepted", respondedAt: now() }, { merge: true });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  // --- Check-ins & Discovery ---

  listNearbyUsers: async (_args: ListNearbyUsersArgs): Promise<ToolResult> => {
    try {
      // Approximate nearby users using recent check-ins (no geo radius yet)
      const snap = await db
        .collection("checkIns")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
      const seen = new Set<string>();
      const users: CheckInUser[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.userId && !seen.has(data.userId)) {
          seen.add(data.userId);
          users.push({
            userId: data.userId,
            placeId: data.placeId,
            placeName: data.placeName,
            location: data.location,
          });
        }
      });
      return { success: true, users };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  checkInToPlace: async (
    args: CheckInArgs,
    userIdOrContext: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const userId = asToolContext(userIdOrContext).userId;
    if (!userId)
      return { success: false, error: "Unauthorized: User ID required" };

    try {
      const checkInId = db.collection("checkIns").doc().id;
      const payload = {
        id: checkInId,
        userId,
        placeId: args.placeId,
        placeName: args.placeName,
        location: args.location || null,
        createdAt: now(),
      };
      await db.collection("checkIns").doc(checkInId).set(payload);
      return { success: true, checkInId };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  getCheckInsForPlace: async (args: PlaceCheckInsArgs): Promise<ToolResult> => {
    try {
      const snap = await db
        .collection("checkIns")
        .where("placeId", "==", args.placeId)
        .orderBy("createdAt", "desc")
        .limit(args.limit || 20)
        .get();
      return { success: true, checkIns: snap.docs.map((d) => d.data()) };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  fetchVibeMapData: async (args: VibeMapArgs): Promise<ToolResult> => {
    logger.debug("Fetching vibe map data for", args.area);
    return { success: true, area: args.area, hotspots: [] };
  },
};
