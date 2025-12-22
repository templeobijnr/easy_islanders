
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { Client, Campaign, ConsumerRequest, BusinessConfig } from '../../types';
import { sanitizeData } from './utils';

const COLLECTIONS = {
  CLIENTS: 'clients',
  CAMPAIGNS: 'campaigns',
  REQUESTS: 'requests',
  CONVERSATIONS: 'conversations'
};

const LOCAL_KEYS = {
  BUSINESS_CONFIG: 'islander_biz_config_v1',
};

export const CrmStorage = {
  getClients: async (): Promise<Client[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.CLIENTS));
      return querySnapshot.docs.map(doc => {
        const data: any = doc.data();
        return {
          ...data,
          tags: Array.isArray(data.tags) ? data.tags.filter((t: any) => typeof t === 'string') : [],
        } as Client;
      });
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
  },

  saveClient: async (client: Client): Promise<Client> => {
    try {
      await setDoc(doc(db, COLLECTIONS.CLIENTS, client.id), sanitizeData(client), { merge: true });
      return client;
    } catch (error) {
      console.error("Error saving client:", error);
      throw error;
    }
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
      return querySnapshot.docs.map(doc => doc.data() as Campaign);
    } catch (error) {
      console.error("Error getting campaigns:", error);
      return [];
    }
  },

  getConsumerRequests: async (): Promise<ConsumerRequest[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.REQUESTS), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ConsumerRequest);
    } catch (error) {
      console.error("Error getting requests:", error);
      return [];
    }
  },

  saveConsumerRequest: async (req: ConsumerRequest): Promise<void> => {
    try {
      await setDoc(doc(db, COLLECTIONS.REQUESTS, req.id), sanitizeData(req));
    } catch (error) {
      console.error("Error saving request:", error);
    }
  },

  // --- AGENT CONVERSATIONS ---
  getConversations: async (businessId?: string): Promise<any[]> => {
    try {
      // In prod: query(collection(...), where('businessId', '==', businessId))
      const q = query(collection(db, COLLECTIONS.CONVERSATIONS), orderBy('time', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching conversations", error);
      return [];
    }
  },

  saveConversation: async (conversation: any): Promise<void> => {
    try {
      await setDoc(doc(db, COLLECTIONS.CONVERSATIONS, conversation.id), sanitizeData(conversation), { merge: true });
    } catch (error) {
      console.error("Error saving conversation", error);
    }
  },

  // --- BUSINESS CONFIG (Local) ---
  getBusinessConfig: async (): Promise<BusinessConfig | null> => {
    const stored = localStorage.getItem(LOCAL_KEYS.BUSINESS_CONFIG);
    return stored ? JSON.parse(stored) : null;
  },

  saveBusinessConfig: async (config: BusinessConfig): Promise<void> => {
    localStorage.setItem(LOCAL_KEYS.BUSINESS_CONFIG, JSON.stringify(config));
  },

  clearBusinessConfig: async (): Promise<void> => {
    localStorage.removeItem(LOCAL_KEYS.BUSINESS_CONFIG);
  },
};
