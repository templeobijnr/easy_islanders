
export type SocialPostType = 'status' | 'check_in' | 'plan' | 'review';
export type SocialRank = 'Castaway' | 'Explorer' | 'Islander' | 'Local Legend';

export interface PassportStamp {
  id: string;
  locationName: string;
  category: 'Nature' | 'History' | 'Dining' | 'Beach' | 'Nightlife' | 'Activity';
  date: string;
  icon: string;
  imageUrl?: string;
}

export interface SocialUser {
  id: string;
  name: string;
  avatar: string;
  rank: SocialRank;
  points: number;
  badges: string[];
  interests: string[];

  // Enhanced discovery fields
  currentLocation?: string;
  coordinates?: { lat: number; lng: number };
  currentMood?: string;
  languages?: string[];
  passportStamps: PassportStamp[];

  // Reputation
  trustScore: number;
  vouches: number;
}

export interface SocialGroup {
  id: string;
  name: string;
  description: string;
  image: string;
  interest: string;
  members: number;
  isMember?: boolean;
  memberIds?: string[];
}

export interface HotZone {
  id: string;
  name: string;
  location: string;
  category: 'Nightlife' | 'Beach' | 'Dining' | 'Cafe' | 'Culture';
  activeCount: number;
  imageUrl: string;
  isTrending?: boolean;
}

export interface SocialPost {
  id: string;
  author: SocialUser;
  type: SocialPostType;
  content: string;
  timestamp: string;
  location?: string;
  imageUrl?: string;

  // Group Context
  groupId?: string;
  tribeName?: string;

  likes: number; // Treated as "Vouches" in UI
  comments: number;
  isLiked?: boolean; // "Vouched"

  attendees?: SocialUser[];
  maxAttendees?: number;
  eventDate?: string;

  rating?: number;
  hashtags?: string[];
}

export interface SocialComment {
  id: string;
  postId: string;
  author: SocialUser;
  content: string;
  timestamp: string;
}
