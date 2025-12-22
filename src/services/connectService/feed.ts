/**
 * connectService Feed Queries
 *
 * Feed aggregation: live venues, quick activities, trending, today, week, featured.
 */
import { collection, query, where, orderBy, getDocs, limit, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UnifiedListingsService } from "../unifiedListingsService";
import type { Region, PinType } from "../../types";
import type { LiveVenue, QuickActivity } from "../../types/connect";
import type { CheckIn, ConnectFeedItem, ConnectFeedResult, TrendingVenue } from "./types";
import { CHECKINS_COLLECTION, USER_ACTIVITIES_COLLECTION, EVENTS_COLLECTION } from "./types";
import { getDate, getActivityStatus, processDoc } from "./feedHelpers";

// Re-export for convenience
export { getActivityStatus } from "./feedHelpers";

/** Get live venues - places with active check-ins */
export async function getLiveVenues(): Promise<LiveVenue[]> {
    const now = Timestamp.now();
    const q = query(collection(db, CHECKINS_COLLECTION), where("expiresAt", ">", now), orderBy("expiresAt", "desc"), limit(100));
    const snapshot = await getDocs(q);
    const checkIns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as CheckIn[];

    const venueMap = new Map<string, { count: number; checkIns: CheckIn[]; pinType: PinType }>();
    for (const c of checkIns) {
        const ex = venueMap.get(c.pinId);
        if (ex) { ex.count++; ex.checkIns.push(c); } else venueMap.set(c.pinId, { count: 1, checkIns: [c], pinType: c.pinType });
    }

    const venues: LiveVenue[] = [];
    for (const [pinId, data] of venueMap) {
        try {
            const listing = await UnifiedListingsService.getListingByType(pinId, data.pinType);
            if (listing) venues.push({ id: pinId, title: listing.title || listing.name || "Unknown", category: listing.category, region: listing.region, coordinates: listing.coordinates, images: listing.images, checkInCount: data.count, recentCheckIns: data.checkIns.slice(0, 5), _badges: data.count >= 5 ? ["🔥 Hot Spot"] : [] });
        } catch (e) { console.error("Failed to fetch venue", pinId, e); }
    }
    return venues.sort((a, b) => b.checkInCount - a.checkInCount);
}

/** Get quick activities for today */
export async function getQuickActivities(region?: Region): Promise<QuickActivity[]> {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const q = query(collection(db, USER_ACTIVITIES_COLLECTION), where("startTime", ">=", Timestamp.fromDate(todayStart)), where("startTime", "<=", Timestamp.fromDate(todayEnd)), orderBy("startTime", "asc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => { const d = doc.data(); if (region && d.region !== region) return null; return { id: doc.id, ...d, status: getActivityStatus(d.startTime, d.endTime) } as QuickActivity; }).filter(Boolean) as QuickActivity[];
}

/** Get my recent check-ins */
export async function getMyCheckIns(userId: string, limitCount: number = 5): Promise<CheckIn[]> {
    const q = query(collection(db, CHECKINS_COLLECTION), where("userId", "==", userId), orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as CheckIn[];
}

/** Get curated items from connectCuration collection */
async function getCuratedItems(section: string, region?: Region): Promise<ConnectFeedItem[]> {
    const q = query(collection(db, "connectCuration"), where("section", "==", section), where("enabled", "==", true), orderBy("priority", "desc"), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => { const d = doc.data(); if (region && d.region && d.region !== region) return null; return { id: doc.id, ...d, _curated: true } as ConnectFeedItem; }).filter(Boolean) as ConnectFeedItem[];
}

/** CHANNEL 2: TODAY'S ITEMS */
export async function getTodayItems(region?: Region): Promise<ConnectFeedItem[]> {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const startTs = Timestamp.fromDate(todayStart), endTs = Timestamp.fromDate(todayEnd);
    const results: ConnectFeedItem[] = [];
    const [actSnap, evtSnap] = await Promise.all([
        getDocs(query(collection(db, USER_ACTIVITIES_COLLECTION), where("startTime", ">=", startTs), where("startTime", "<=", endTs), limit(20))),
        getDocs(query(collection(db, EVENTS_COLLECTION), where("startDate", ">=", startTs), where("startDate", "<=", endTs), limit(20)))
    ]);
    actSnap.docs.forEach((d) => { if (!region || d.data().region === region) results.push(processDoc(d, "userActivity")); });
    evtSnap.docs.forEach((d) => { if (!region || d.data().region === region) results.push(processDoc(d, "event")); });
    results.push(...await getCuratedItems("today", region));
    return results.sort((a, b) => (getDate(a.startTime)?.getTime() || 0) - (getDate(b.startTime)?.getTime() || 0));
}

/** CHANNEL 3: WEEK'S ITEMS */
export async function getWeekItems(region?: Region): Promise<ConnectFeedItem[]> {
    const now = new Date(), dow = now.getDay();
    let wStart = new Date(), wEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (dow >= 1 && dow <= 4) { const dToFri = (5 - dow + 7) % 7 || 7; wStart = new Date(now.getTime() + dToFri * 24 * 60 * 60 * 1000); wStart.setHours(0, 0, 0, 0); wEnd = new Date(wStart.getTime() + 2 * 24 * 60 * 60 * 1000); } else wStart.setHours(0, 0, 0, 0);
    wEnd.setHours(23, 59, 59, 999);
    const startTs = Timestamp.fromDate(wStart), endTs = Timestamp.fromDate(wEnd);
    const results: ConnectFeedItem[] = [];
    const evtSnap = await getDocs(query(collection(db, EVENTS_COLLECTION), where("startDate", ">=", startTs), where("startDate", "<=", endTs), limit(20)));
    evtSnap.docs.forEach((d) => { if (!region || d.data().region === region) results.push(processDoc(d, "event")); });
    results.push(...await getCuratedItems("week", region));
    return results.sort((a, b) => (getDate(a.startTime)?.getTime() || 0) - (getDate(b.startTime)?.getTime() || 0));
}

/** CHANNEL 5: FEATURED ITEMS */
export async function getFeaturedItems(region?: Region): Promise<ConnectFeedItem[]> {
    const curated = await getCuratedItems("featured", region);
    if (curated.length >= 10) return curated;
    const listings = await UnifiedListingsService.getAllListings({ region, limit: 10 });
    const featured = listings.filter((l) => (l.rating || 0) >= 4).slice(0, 10 - curated.length).map((l) => ({ id: l.id, type: l.type, title: l.title || l.name, description: l.description, category: l.category, region: l.region, images: l.images, itemImage: l.heroImage || l.images?.[0], coordinates: l.coordinates, _badges: ["⭐ Top Rated"] }));
    return [...curated, ...featured];
}

/** CHANNEL 4: TRENDING ITEMS */
export async function getTrendingItems(region?: Region): Promise<TrendingVenue[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(collection(db, CHECKINS_COLLECTION), where("timestamp", ">=", Timestamp.fromDate(oneDayAgo)), orderBy("timestamp", "desc"), limit(200));
    const snap = await getDocs(q);
    const scores = new Map<string, { checkIns: number; pinType: PinType }>();
    snap.docs.forEach((d) => { const data = d.data(); const ex = scores.get(data.pinId); if (ex) ex.checkIns++; else scores.set(data.pinId, { checkIns: 1, pinType: data.pinType }); });
    const trending: TrendingVenue[] = [];
    for (const [pinId, score] of scores) {
        if (score.checkIns < 2) continue;
        try {
            const listing = await UnifiedListingsService.getListingByType(pinId, score.pinType);
            if (!listing || (region && listing.region !== region)) continue;
            trending.push({ id: pinId, title: listing.title || listing.name || "Unknown", category: listing.category || "Place", region: listing.region as Region, coordinates: listing.coordinates || { lat: 0, lng: 0 }, lat: listing.coordinates?.lat, lng: listing.coordinates?.lng, images: listing.images || [], address: listing.address, heatScore: score.checkIns * 2 + (listing.reviewCount || 0), recentCheckIns: score.checkIns, recentReviews: listing.reviewCount || 0, _badges: score.checkIns >= 5 ? ["🔥 Hot Right Now"] : [] });
        } catch (e) { console.error("Failed to fetch trending venue", pinId, e); }
    }
    return trending.sort((a, b) => b.heatScore - a.heatScore).slice(0, 10);
}

/** Get Connect Feed with 5 channels */
export async function getConnectFeed(region?: Region): Promise<ConnectFeedResult> {
    const [liveNow, todayItems, weekItems, trendingItems, featuredItems] = await Promise.all([getLiveVenues(), getTodayItems(region), getWeekItems(region), getTrendingItems(region), getFeaturedItems(region)]);
    return { liveNow, todayItems, weekItems, trendingItems, featuredItems };
}
