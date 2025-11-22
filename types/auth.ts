
import { PassportStamp, SocialRank } from './social';

export type UserType = 'personal' | 'business';

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  currency: string;
  language: string;
  privacy: 'public' | 'friends' | 'private';
}

export interface UserProfile {
  bio?: string;
  interests?: string[];
  location?: string;
  socialHandle?: string; // @username
  isIslander?: boolean; // Joined Connect?
  joinDate?: string;
  passportStamps?: PassportStamp[];
  rank?: SocialRank;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'booking' | 'social' | 'system' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
  actionRequired?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
  businessName?: string;
  avatar?: string;
  phone?: string;
  settings?: UserSettings;
  profile?: UserProfile;
}
