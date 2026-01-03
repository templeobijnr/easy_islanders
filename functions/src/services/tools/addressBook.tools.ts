import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { asToolContext, UserIdOrToolContext } from "./toolContext";
import { getErrorMessage } from "../../utils/errors";

const CoordinatesSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
  })
  .optional();

const CreateOrUpdateAddressArgsSchema = z.object({
  addressId: z.string().min(1).optional(),
  label: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  country: z.string().min(1),
  accessNotes: z.string().optional(),
  coordinates: CoordinatesSchema,
});
type CreateOrUpdateAddressArgs = z.infer<typeof CreateOrUpdateAddressArgsSchema>;

const SetDefaultAddressArgsSchema = z.object({
  addressId: z.string().min(1),
});
type SetDefaultAddressArgs = z.infer<typeof SetDefaultAddressArgsSchema>;

type ToolResult = {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

function userAddressesRef(userId: string) {
  return db.collection("users").doc(userId).collection("addresses");
}

export const addressBookTools = {
  /**
   * List user's saved addresses.
   * Writes: none.
   */
  listUserAddresses: async (
    _args: Record<string, never>,
    userIdOrContext: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) return { success: false, error: "Unauthorized: User ID required" };

    try {
      const [userDoc, snap] = await Promise.all([
        db.collection("users").doc(userId).get(),
        userAddressesRef(userId).orderBy("updatedAt", "desc").limit(50).get(),
      ]);

      const defaultAddressId = userDoc.exists ? (userDoc.data() as any)?.defaultAddressId : undefined;

      return {
        success: true,
        defaultAddressId: defaultAddressId || null,
        addresses: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Failed to list addresses" };
    }
  },

  /**
   * Create or update a user's address.
   * Writes: users/{userId}/addresses/{addressId}, and MAY set users/{userId}.defaultAddressId if missing.
   */
  createOrUpdateAddress: async (
    args: CreateOrUpdateAddressArgs,
    userIdOrContext: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) return { success: false, error: "Unauthorized: User ID required" };

    const parsed = CreateOrUpdateAddressArgsSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const now = Timestamp.now();
    const data = parsed.data;
    const ref = data.addressId
      ? userAddressesRef(userId).doc(data.addressId)
      : userAddressesRef(userId).doc();

    try {
      await ref.set(
        {
          label: data.label,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          region: data.region,
          country: data.country,
          accessNotes: data.accessNotes || null,
          coordinates: data.coordinates || null,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      // Fail-closed friendly defaulting: if user has no default address yet, set it now.
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      const currentDefault = userSnap.exists ? (userSnap.data() as any)?.defaultAddressId : undefined;
      if (!currentDefault) {
        await userRef.set({ defaultAddressId: ref.id, updatedAt: now }, { merge: true });
      }

      return {
        success: true,
        addressId: ref.id,
        defaultAddressId: currentDefault || ref.id,
      };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Failed to save address" };
    }
  },

  /**
   * Set the user's default addressId.
   * Writes: users/{userId}.defaultAddressId
   */
  setDefaultAddress: async (
    args: SetDefaultAddressArgs,
    userIdOrContext: UserIdOrToolContext,
  ): Promise<ToolResult> => {
    const ctx = asToolContext(userIdOrContext);
    const userId = ctx.userId;
    if (!userId) return { success: false, error: "Unauthorized: User ID required" };

    const parsed = SetDefaultAddressArgsSchema.safeParse(args);
    if (!parsed.success) return { success: false, error: parsed.error.message };

    try {
      const addressSnap = await userAddressesRef(userId).doc(parsed.data.addressId).get();
      if (!addressSnap.exists) {
        return { success: false, error: "Address not found", message: "That address doesn't exist." };
      }

      await db
        .collection("users")
        .doc(userId)
        .set({ defaultAddressId: parsed.data.addressId, updatedAt: Timestamp.now() }, { merge: true });

      return { success: true, defaultAddressId: parsed.data.addressId };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Failed to set default address" };
    }
  },
};




