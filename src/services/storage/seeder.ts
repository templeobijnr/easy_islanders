import { logger } from "@/utils/logger";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import {
  MOCK_CLIENTS,
  MOCK_CAMPAIGNS,
  ALL_MOCK_ITEMS,
  MOCK_SOCIAL_FEED,
  MOCK_GROUPS,
  MOCK_SOCIAL_USERS,
} from "../../components/constants";
import { sanitizeData } from "./utils";

const COLLECTIONS = {
  LISTINGS: "listings",
  CLIENTS: "clients",
  CAMPAIGNS: "campaigns",
  SOCIAL_POSTS: "social_posts",
  SOCIAL_GROUPS: "social_groups",
  SOCIAL_USERS: "social_users",
  CONVERSATIONS: "conversations",
};

export const SeederStorage = {
  seedDatabase: async (): Promise<boolean> => {
    try {
      logger.debug("Manual Seeding Started...");

      // 1. Listings
      const listingsSnap = await getDocs(collection(db, COLLECTIONS.LISTINGS));
      if (listingsSnap.empty) {
        await Promise.all(
          ALL_MOCK_ITEMS.map((item) =>
            setDoc(doc(db, COLLECTIONS.LISTINGS, item.id), sanitizeData(item)),
          ),
        );
        logger.debug(`Seeded ${ALL_MOCK_ITEMS.length} Listings`);
      }

      // 2. Clients
      const clientsSnap = await getDocs(collection(db, COLLECTIONS.CLIENTS));
      if (clientsSnap.empty) {
        await Promise.all(
          MOCK_CLIENTS.map((item) =>
            setDoc(doc(db, COLLECTIONS.CLIENTS, item.id), sanitizeData(item)),
          ),
        );
        logger.debug("Seeded Clients");
      }

      // 3. Campaigns
      const campSnap = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
      if (campSnap.empty) {
        await Promise.all(
          MOCK_CAMPAIGNS.map((item) =>
            setDoc(doc(db, COLLECTIONS.CAMPAIGNS, item.id), sanitizeData(item)),
          ),
        );
        logger.debug("Seeded Campaigns");
      }

      // 4. Social Feed
      const postsSnap = await getDocs(collection(db, COLLECTIONS.SOCIAL_POSTS));
      if (postsSnap.empty) {
        await Promise.all(
          MOCK_SOCIAL_FEED.map((item) =>
            setDoc(
              doc(db, COLLECTIONS.SOCIAL_POSTS, item.id),
              sanitizeData(item),
            ),
          ),
        );
        logger.debug("Seeded Social Posts");
      }

      // 5. Groups
      const groupsSnap = await getDocs(
        collection(db, COLLECTIONS.SOCIAL_GROUPS),
      );
      if (groupsSnap.empty) {
        await Promise.all(
          MOCK_GROUPS.map((item) =>
            setDoc(
              doc(db, COLLECTIONS.SOCIAL_GROUPS, item.id),
              sanitizeData(item),
            ),
          ),
        );
        logger.debug("Seeded Groups");
      }

      // 6. Users
      const usersSnap = await getDocs(collection(db, COLLECTIONS.SOCIAL_USERS));
      if (usersSnap.empty) {
        await Promise.all(
          MOCK_SOCIAL_USERS.map((item) =>
            setDoc(
              doc(db, COLLECTIONS.SOCIAL_USERS, item.id),
              sanitizeData(item),
            ),
          ),
        );
        logger.debug("Seeded Social Users");
      }

      // 7. Conversations (Seed Mock)
      const convoSnap = await getDocs(
        collection(db, COLLECTIONS.CONVERSATIONS),
      );
      if (convoSnap.empty) {
        const mockConvos = [
          {
            id: "1",
            name: "James Wilson",
            msg: "Is the villa available next week?",
            time: "10:42 AM",
            unread: true,
            relatedListing: {
              title: "Seafront Luxury Villa",
              image:
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop",
              price: "£350 / night",
              location: "Catalkoy",
            },
          },
          {
            id: "2",
            name: "Sarah Jenkins",
            msg: "Thanks for the viewing!",
            time: "Yesterday",
            unread: false,
            relatedListing: {
              title: "Modern Harbour Penthouse",
              image:
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2580&auto=format&fit=crop",
              price: "£1,200 / month",
              location: "Kyrenia Center",
            },
          },
        ];
        await Promise.all(
          mockConvos.map((item) =>
            setDoc(
              doc(db, COLLECTIONS.CONVERSATIONS, item.id),
              sanitizeData(item),
            ),
          ),
        );
        logger.debug("Seeded Conversations");
      }

      logger.debug("Database Seeded Successfully");
      return true;
    } catch (e) {
      console.error("Seeding failed:", e);
      return false;
    }
  },
};
