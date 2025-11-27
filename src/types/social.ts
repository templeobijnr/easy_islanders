
/**
 * Social graph and Islanders Connect types.
 *
 * These interfaces model:
 *  - social users and their "passport stamps"
 *  - groups / tribes
 *  - hot zones on the island
 *  - posts and comments in the Connect feed
 *
 * They are frontend/domain types only and do not assume
 * a specific storage layout in Firestore.
 */

/** High‑level type of a social post in the feed. */
export type SocialPostType = 'status' | 'check_in' | 'plan' | 'review';

/** Gamified reputation tier for a social user. */
export type SocialRank = 'Castaway' | 'Explorer' | 'Islander' | 'Local Legend';

/**
 * A "stamp" in the user's digital passport, representing
 * somewhere they've been or an experience they've had.
 */
export interface PassportStamp {
  id: string;
  locationName: string;
  category: 'Nature' | 'History' | 'Dining' | 'Beach' | 'Nightlife' | 'Activity';
  date: string;
  icon: string;
  imageUrl?: string;
}

/**
 * Core public profile for Islanders Connect.
 * Separate from Firebase Auth; focused on social presence
 * and discovery signals (trust score, vouches, interests).
 */
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

/**
 * A social group / tribe users can join and post into.
 * In the UI this maps closely to Connect "tribes"/hashtags.
 */
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

/**
 * A "hot zone" – an area on the island that currently has
 * a lot of activity (check‑ins, events, nightlife, etc.).
 */
export interface HotZone {
  id: string;
  name: string;
  location: string;
  category: 'Nightlife' | 'Beach' | 'Dining' | 'Cafe' | 'Culture';
  activeCount: number;
  imageUrl: string;
  isTrending?: boolean;
}

/**
 * A single item in the social feed.
 * Can represent:
 *  - status updates
 *  - check‑ins
 *  - plans / events
 *  - reviews with ratings
 */
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

/** Comment left on a social post. */
export interface SocialComment {
  id: string;
  postId: string;
  author: SocialUser;
  content: string;
  timestamp: string;
}
