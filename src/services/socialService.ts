import { logger } from "@/utils/logger";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import {
  SocialPost,
  SocialGroup,
  SocialUser,
  HotZone,
  SocialComment,
} from "../types/social";
import { EventItem } from "../types/marketplace";

const COLLECTIONS = {
  POSTS: "socialPosts",
  GROUPS: "socialGroups",
  USERS: "socialUsers",
  ZONES: "hotZones",
  EVENTS: "events",
  WAVES: "waves",
};

export const SocialService = {
  // --- FEED ---

  async getFeed(limitCount = 20, tribeId?: string): Promise<SocialPost[]> {
    try {
      let q;
      if (tribeId) {
        q = query(
          collection(db, COLLECTIONS.POSTS),
          where("groupId", "==", tribeId),
          orderBy("timestamp", "desc"),
          limit(limitCount),
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.POSTS),
          orderBy("timestamp", "desc"),
          limit(limitCount),
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as SocialPost,
      );
    } catch (error) {
      console.error("Error fetching feed:", error);
      return [];
    }
  },

  async createPost(
    post: Omit<SocialPost, "id" | "timestamp" | "likes" | "comments">,
  ): Promise<string> {
    if (!auth.currentUser) throw new Error("Must be logged in");

    // Parse Hashtags
    const hashtags =
      post.content
        .match(/#[a-z0-9_]+/gi)
        ?.map((t) => t.substring(1).toLowerCase()) || [];
    if (post.tribeName && !hashtags.includes(post.tribeName.toLowerCase())) {
      hashtags.push(post.tribeName.toLowerCase());
    }

    // Handle Tribes (Groups) - auto-join user to any hashtags they use
    for (const tag of hashtags) {
      const groupId = `tribe_${tag}`;
      const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        // Create new Tribe
        const newGroup: SocialGroup = {
          id: groupId,
          name: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Tribe`,
          description: `Community for #${tag} enthusiasts.`,
          image: `https://source.unsplash.com/random/800x600/?${tag}`, // Auto-image
          interest: tag,
          members: 1,
          memberIds: [auth.currentUser.uid],
        };
        await setDoc(groupRef, newGroup);
      } else {
        const data = groupSnap.data() as SocialGroup & { memberIds?: string[] };
        if (!data.memberIds || !data.memberIds.includes(auth.currentUser.uid)) {
          await updateDoc(groupRef, {
            members: increment(1),
            memberIds: arrayUnion(auth.currentUser.uid),
          });
        }
      }
    }

    const newPost = {
      ...post,
      author: {
        ...post.author,
        id: auth.currentUser.uid,
      },
      hashtags,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp(),
      userId: auth.currentUser.uid, // Add userId for Firestore rules
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.POSTS), newPost);
    return docRef.id;
  },

  async toggleLike(postId: string, isLiked: boolean): Promise<void> {
    if (!auth.currentUser) return;
    const postRef = doc(db, COLLECTIONS.POSTS, postId);
    await updateDoc(postRef, {
      likes: increment(isLiked ? 1 : -1),
    });
  },

  // --- COMMENTS ---

  async addComment(
    postId: string,
    content: string,
  ): Promise<SocialComment | null> {
    if (!auth.currentUser) return null;
    const userProfile = await this.getUserProfile(auth.currentUser.uid);
    if (!userProfile) return null;

    const comment: SocialComment = {
      id: `c_${Date.now()}`,
      postId,
      author: userProfile,
      content,
      timestamp: new Date().toISOString(),
    };

    // Add to subcollection
    const commentsRef = collection(db, COLLECTIONS.POSTS, postId, "comments");
    await addDoc(commentsRef, comment);

    // Update post comment count
    const postRef = doc(db, COLLECTIONS.POSTS, postId);
    await updateDoc(postRef, {
      comments: increment(1),
    });

    return comment;
  },

  async getComments(postId: string): Promise<SocialComment[]> {
    try {
      const commentsRef = collection(db, COLLECTIONS.POSTS, postId, "comments");
      const q = query(commentsRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as SocialComment,
      );
    } catch (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
  },

  // --- GROUPS ---

  async getGroups(): Promise<SocialGroup[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.GROUPS));
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as SocialGroup,
      );
    } catch (error) {
      console.error("Error fetching groups:", error);
      return [];
    }
  },

  async getGroupsForUser(userId: string): Promise<SocialGroup[]> {
    try {
      const qGroups = query(
        collection(db, COLLECTIONS.GROUPS),
        where("memberIds", "array-contains", userId),
      );
      const snapshot = await getDocs(qGroups);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data(), isMember: true }) as SocialGroup,
      );
    } catch (error) {
      console.error("Error fetching user groups:", error);
      return [];
    }
  },

  async createOrJoinGroup(
    name: string,
    interest: string,
  ): Promise<SocialGroup> {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const slug = interest.toLowerCase().replace(/\s+/g, "_");
    const groupId = `tribe_${slug}`;
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) {
      const newGroup: SocialGroup = {
        id: groupId,
        name: name || `${interest} Tribe`,
        description: `Community for #${interest}`,
        image: `https://source.unsplash.com/random/800x600/?${slug}`,
        interest: interest,
        members: 1,
        memberIds: [auth.currentUser.uid],
      };
      await setDoc(groupRef, newGroup);
      return newGroup;
    } else {
      const data = snap.data() as SocialGroup & { memberIds?: string[] };
      if (!data.memberIds || !data.memberIds.includes(auth.currentUser.uid)) {
        await updateDoc(groupRef, {
          members: increment(1),
          memberIds: arrayUnion(auth.currentUser.uid),
        });
      }
      return {
        id: groupId,
        ...data,
        isMember: true,
        memberIds: data.memberIds || [],
      } as any;
    }
  },

  async joinGroup(groupId: string): Promise<void> {
    if (!auth.currentUser) return;
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
    await updateDoc(groupRef, {
      members: increment(1),
      memberIds: arrayUnion(auth.currentUser.uid),
    });
  },

  // --- USERS & PROFILES ---

  async getUserProfile(userId: string): Promise<SocialUser | null> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as SocialUser;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  async ensureUserProfile(user: any): Promise<SocialUser> {
    const profile = await this.getUserProfile(user.id);
    if (profile) return profile;

    const newProfile: SocialUser = {
      id: user.id,
      name: user.name || "Islander",
      avatar:
        user.avatar ||
        `https://ui-avatars.com/api/?name=${user.name || "User"}`,
      rank: "Castaway",
      points: 0,
      badges: ["Newcomer"],
      interests: user.profile?.interests || [],
      trustScore: 10,
      vouches: 0,
      passportStamps: [],
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.id), newProfile);
    return newProfile;
  },

  async getTopExplorers(limitCount = 5): Promise<SocialUser[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        orderBy("vouches", "desc"),
        limit(limitCount),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as SocialUser,
      );
    } catch (error) {
      console.error("Error fetching top explorers:", error);
      return [];
    }
  },

  // --- ZONES ---

  async getHotZones(): Promise<HotZone[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.ZONES));
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as HotZone,
      );
    } catch (error) {
      console.error("Error fetching hot zones:", error);
      return [];
    }
  },

  // --- SEEDING ---

  async seedDatabase(): Promise<void> {
    // Dynamic import to avoid circular dependencies if constants imports types that import this service (unlikely but safe)
    const {
      MOCK_SOCIAL_FEED,
      MOCK_GROUPS,
      MOCK_SOCIAL_USERS,
      MOCK_HOT_ZONES,
      MOCK_EVENTS,
    } = await import("../constants");

    // Seed Posts
    const postsSnap = await getDocs(collection(db, COLLECTIONS.POSTS));
    if (postsSnap.empty) {
      logger.debug("Seeding Posts...");
      for (const post of MOCK_SOCIAL_FEED) {
        await setDoc(doc(db, COLLECTIONS.POSTS, post.id), post);
      }
    }

    // Seed Groups
    const groupsSnap = await getDocs(collection(db, COLLECTIONS.GROUPS));
    if (groupsSnap.empty) {
      logger.debug("Seeding Groups...");
      for (const group of MOCK_GROUPS) {
        await setDoc(doc(db, COLLECTIONS.GROUPS, group.id), group);
      }
    }

    // Seed Users
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnap.empty) {
      logger.debug("Seeding Users...");
      for (const user of MOCK_SOCIAL_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, user.id), user);
      }
    }

    // Seed Hot Zones
    const zonesSnap = await getDocs(collection(db, COLLECTIONS.ZONES));
    if (zonesSnap.empty) {
      logger.debug("Seeding Hot Zones...");
      for (const zone of MOCK_HOT_ZONES) {
        await setDoc(doc(db, COLLECTIONS.ZONES, zone.id), zone);
      }
    }

    // Seed Events
    const eventsSnap = await getDocs(collection(db, COLLECTIONS.EVENTS));
    if (eventsSnap.empty) {
      logger.debug("Seeding Events...");
      for (const event of MOCK_EVENTS) {
        await setDoc(doc(db, COLLECTIONS.EVENTS, event.id), event);
      }
    }
  },

  // --- GAMIFICATION ---

  async awardStamp(userId: string, zone: HotZone): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data() as SocialUser;
    const hasStamp = userData.passportStamps.some(
      (s) => s.locationName === zone.name,
    );

    if (!hasStamp) {
      const newStamp = {
        id: `stamp_${Date.now()}`,
        locationName: zone.name,
        category: zone.category,
        date: new Date().toISOString(),
        icon: "📍", // Could map category to icon
        imageUrl: zone.imageUrl,
      };

      await updateDoc(userRef, {
        passportStamps: arrayUnion(newStamp),
        points: increment(50), // Award points for new discovery
      });
    } else {
      // Just award points for check-in
      await updateDoc(userRef, {
        points: increment(10),
      });
    }
  },

  // --- EVENTS ---

  async getEvents(limitCount = 5): Promise<EventItem[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.EVENTS),
        orderBy("date", "asc"),
        limit(limitCount),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as EventItem,
      );
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  },

  // --- STORAGE ---

  async uploadImage(file: File): Promise<string> {
    try {
      // Dynamically import storage functions to avoid initial load cost if not used
      const { ref, uploadBytes, getDownloadURL } =
        await import("firebase/storage");
      const { storage } = await import("./firebaseConfig");

      const path = `social_images/${auth.currentUser?.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  // --- INTERACTIONS ---

  async wave(sender: SocialUser, receiverId: string): Promise<void> {
    try {
      const waveId = `wave_${sender.id}_${receiverId}`;
      const reverseId = `wave_${receiverId}_${sender.id}`;

      const reverseRef = doc(db, COLLECTIONS.WAVES, reverseId);
      const reverseSnap = await getDoc(reverseRef);

      if (reverseSnap.exists()) {
        // Mutual wave -> connect
        await setDoc(doc(db, COLLECTIONS.WAVES, waveId), {
          senderId: sender.id,
          receiverId,
          status: "connected",
          timestamp: serverTimestamp(),
        });
        await updateDoc(reverseRef, { status: "connected" });

        const connectNotification: any = {
          id: `notif_${Date.now()}_${sender.id}`,
          userId: receiverId,
          type: "social",
          title: "You’re Connected! 🤝",
          message: `${sender.name} waved back. You’re now connected!`,
          read: false,
          timestamp: new Date().toISOString(),
          link: `/connect`,
        };
        await setDoc(
          doc(db, "notifications", connectNotification.id),
          connectNotification,
        );
      } else {
        await setDoc(doc(db, COLLECTIONS.WAVES, waveId), {
          senderId: sender.id,
          receiverId,
          status: "pending",
          timestamp: serverTimestamp(),
        });

        const notification: any = {
          // Using any to avoid strict type checks against UserNotification if imports are tricky, but ideally import it
          id: `notif_${Date.now()}_${sender.id}`,
          userId: receiverId,
          type: "social",
          title: "New Wave! 👋",
          message: `${sender.name} waved at you!`,
          read: false,
          timestamp: new Date().toISOString(),
          link: `/connect`,
        };
        await setDoc(doc(db, "notifications", notification.id), notification);
      }
    } catch (error) {
      console.error("Error sending wave:", error);
    }
  },

  async getConnectionStatus(
    userId: string,
    otherId: string,
  ): Promise<"connected" | "pending" | "none"> {
    const waveRef = doc(db, COLLECTIONS.WAVES, `wave_${userId}_${otherId}`);
    const snap = await getDoc(waveRef);
    if (!snap.exists()) return "none";
    const data = snap.data() as any;
    return (data.status || "pending") as any;
  },

  async leaveGroup(groupId: string): Promise<void> {
    if (!auth.currentUser) return;
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
    await updateDoc(groupRef, {
      members: increment(-1),
      memberIds: arrayRemove(auth.currentUser.uid),
    });
  },
};
