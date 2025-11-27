
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { SocialPost, SocialGroup, SocialUser } from '../../types';
import { sanitizeData } from './utils';

const COLLECTIONS = {
  POSTS: 'social_posts',
  GROUPS: 'social_groups',
  USERS: 'social_users',
  CONVERSATIONS: 'conversations'
};

export const SocialStorage = {
  getSocialPosts: async (): Promise<SocialPost[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.POSTS), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SocialPost);
    } catch (error) {
      console.error("Error fetching social posts:", error);
      return [];
    }
  },

  saveSocialPost: async (post: SocialPost): Promise<void> => {
    try {
      await setDoc(doc(db, COLLECTIONS.POSTS, post.id), sanitizeData(post));
    } catch (error) {
      console.error("Error saving social post:", error);
    }
  },

  getSocialGroups: async (): Promise<SocialGroup[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.GROUPS));
      return querySnapshot.docs.map(doc => doc.data() as SocialGroup);
    } catch (error) {
      console.error("Error fetching groups:", error);
      return [];
    }
  },

  saveSocialGroup: async (group: SocialGroup): Promise<void> => {
      await setDoc(doc(db, COLLECTIONS.GROUPS, group.id), sanitizeData(group), { merge: true });
  },

  getSocialUsers: async (): Promise<SocialUser[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return querySnapshot.docs.map(doc => doc.data() as SocialUser);
    } catch (error) {
      console.error("Error fetching social users:", error);
      return [];
    }
  },

  getConversations: async (): Promise<any[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.CONVERSATIONS));
      if (querySnapshot.empty) return [];
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  },

  saveConversation: async (convo: any): Promise<void> => {
      await setDoc(doc(db, COLLECTIONS.CONVERSATIONS, convo.id), sanitizeData(convo));
  },
};
