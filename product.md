Below is the clean, unambiguous, fully-structured PRODUCT SPEC for what you just described — rewritten so it is coherent, buildable, all features connected, and does NOT collapse into chaos.

This is the V1.5 product spec (V1 = Discovery + Booking, V1.5 = Connect Feed + Connect Map + People Visibility).
Everything is expressed in non-fluffy engineering language so you can hand this to devs.

⸻

PRODUCT SPEC: EASY ISLANDERS – DISCOVER + CONNECT (V1.5)

Core modules:
	1.	Discover Page
	2.	Listing Pages (Stays / Experiences)
	3.	Connect Feed
	4.	Connect Map
	5.	User Actions (Check-ins, Join, Wave)
	6.	Admin Panel (Control Tower)
	7.	Firestore Structure

Everything below fits together into one coherent system.

⸻

1. DISCOVER PAGE (REPLACES OLD EXPLORE PAGE)

Purpose:

Central hub where users see Stays → Experiences → Places → Regions.

Sections:
	1.	All Stays
	•	Grid of stays (short-term rentals + hotels).
	•	Filters: Region, Price, Type.
	•	Tap → Open Stay Listing Page.
	2.	All Experiences / Activities
	•	Activity cards with image, duration, price.
	•	Tap → Experience Page.
	3.	Explore by Region
	•	Regions list: Kyrenia, Famagusta, Nicosia, Karpaz.
	•	Tapping a region shows:
• Places
• Activities
• Events
• Hotspots
	•	Pulls from Firestore.
	4.	Featured Places
	•	Curated set (cafés, beaches, historical sites).
	•	Added via admin panel.

Actions from Discover Page:
	•	Book Stay
	•	Book Experience
	•	Open Connect
	•	Browse Regions
	•	Save items (optional future)

⸻

2. CONNECT FEED

Purpose:

A content feed showing everything happening on the island right now:
• Activities
• Events
• Places
• Trips
• User-created activities
• Check-ins (aggregated count, no live tracking)

Feed Structure:

Each feed item is one of:
	1.	Activity Card
	•	Title, image, location
	•	“Join activity”
	•	“See people going” (# count)
	•	“Wave to participants”
	•	“Open map location”
	2.	Event Card
	•	Title, date/time
	•	Created by Admin OR user
	•	“Join event”
	•	“Invite friends”
	•	People count
	•	Map link
	3.	Place Spotlight
	•	Café, beach, sight
	•	Admin curated
	•	“Check in”
	•	“Plan trip”
	•	“Taxi here”
	•	“See people checked-in”
	4.	Trips (User-created)
	•	User plans a trip (example: Saturday beach hop)
	•	People can join
	•	Appears on feed + map
	•	Simple card:
• Title
• Locations included
• Time
• “Join Trip”
• “Invite Friends”

Region Tabs (top of feed):
	•	ALL
	•	Kyrenia
	•	Famagusta
	•	Nicosia
	•	Karpaz

Choosing a region filters feed.

⸻

3. CONNECT MAP

Purpose:

Map showing Places + Activities + Events + User Presence via Check-ins.

Pins Types (Admin-controlled):
	1.	Place
	2.	Activity
	3.	Event
	4.	User-created activity/event
	5.	Trip route pin (optional – future)

Pin Actions:

When tapping a pin, a bottom sheet shows:

For Places:
	•	Title, images, description
	•	“Check in”
	•	“Taxi here”
	•	“Plan trip”
	•	“See people here” (# + avatars)
	•	“Wave to people here” (simple broadcast wave)

For Activities:
	•	Title, price, time
	•	“Join activity”
	•	“Book now” (if paid)
	•	“Check in”
	•	“Waves”
	•	People list

For Events:
	•	Title, host, time
	•	“Join event”
	•	“Check in when you arrive”
	•	People list
	•	“Wave to attendants”

For User-created Activities:
	•	Title, creator name (first name only)
	•	“Join”
	•	“Invite friends”
	•	Map link
	•	Check-ins

People Visibility Rules:
	•	People appear ONLY on pins they checked into.
	•	No real-time GPS.
	•	Check-ins auto-expire after X hours (2–6 hours).
	•	Avatars displayed in small bubbles.
	•	Waving sends a general notification to all checked-in users (“X waved at everyone here!”).

⸻

4. USER ACTIONS

1. Check-In

User taps “Check-in”.
Firestore stores:
	•	userId
	•	pinId
	•	type (place/activity/event)
	•	checkedInAt
	•	expiresAt
User appears on pin.

2. Join Event / Activity
	•	Stored as a join record
	•	Appears on feed
	•	Appears on map
	•	User becomes visible on pin once check-in happens at the event time

3. Create Activity / Event

User generates:
	•	Title
	•	Description
	•	Location (choose on map / search via Google Places / use current GPS)
	•	Time
	•	Category
	•	Public or Private
	•	Optional image

Submitted as “pending approval” → appears once admin approves.

4. Plan Trip

V1 trip planning is simple:
	•	Choose 1–3 locations
	•	Choose time
	•	Trip appears as a card in the feed
	•	People can join

(Full itinerary builder = Phase 2.)

5. Wave
	•	One-button broadcast
	•	Appears as: “John waved at everyone checking into Salamis Ruins.”

⸻

5. ADMIN PANEL (CONTROL TOWER)

Admin Capabilities:

A. Pins Management

Add/edit/remove:
	•	Place
	•	Activity
	•	Event
	•	Trip (admin-made)
	•	User-created events (approve/deny)

Admin Pin Creation Options (very important):

1. Drop on map manually
Admin drags a pin to any location.

2. Google Places search integration
Admin types:
“Salamis Ruins” → auto-completes → chooses result → autofills coordinates.

3. “Use my location”
Admin taps button →
Browser/mobile gets geolocation →
Pin is placed at admin’s current position.

For Each Pin Admin Sets:

Admin fills:
	•	title
	•	description
	•	category
	•	region
	•	pin type (place/activity/event)
	•	actions available (checkboxes):
• allow Check-in
• allow Join
• allow Wave
• allow Booking
• allow Taxi

This gives full control of what actions appear on each pin.

⸻

B. Feed Curation

Admin can push:
	•	Featured places
	•	Featured events
	•	Featured activities
	•	Region-specific highlights
	•	Hotspots (“Kyrenia Harbour trending”)

C. Moderation Tools

Admin can:
	•	Approve/deny user-created activities
	•	Remove problematic events
	•	View check-ins (list of records)
	•	Clear expired check-ins
	•	Manage locations
	•	Tag “key site”, “historical site”, “beach”, “nightlife”, etc.

D. Stays / Experiences Management
	•	Add/edit stays
	•	Add/edit experiences
	•	Upload photos
	•	Set pricing
	•	Mark as featured

⸻

6. FIRESTORE STRUCTURE (Final)

1. places/

id  
title  
description  
coordinates { lat, lng }  
category  
region  
images[]  
actions { checkIn: true, taxi: true, book: false, join: false }  
createdAt  
updatedAt

2. activities/

id  
title  
description  
coordinates  
category  
price  
startTime  
endTime  
images[]  
actions { join: true, checkIn: true, wave: true }  
createdBy  
approved: true  
createdAt  
updatedAt

3. events/

id  
title  
description  
coordinates  
startTime  
endTime  
public: true/false  
createdBy: userId or admin  
approved: true/false  
actions { join, checkIn, wave }  
createdAt  
updatedAt

4. checkins/

id  
userId  
pinType: place/activity/event  
pinId  
checkedInAt  
expiresAt

5. joins/

id  
userId  
pinId  
pinType  
joinedAt

6. trips/ (admin or user)

id  
title  
stops[] (array of pinIds)  
startTime  
public: true/false  
createdBy  
approved  
createdAt  
updatedAt


⸻

7. CONNECT FLOW (User)

User opens Connect → sees:

Top:

• Region Tabs
• Search bar

Middle:

FEED
	•	Events
	•	Activities
	•	Trips
	•	Places
All with join/check-in counts.

Button:

“Open Map”

Map:

Pins + people counts.

User taps a pin → bottom sheet slides up → actions visible.

⸻

8. CONNECT FLOW (Admin)

Admin → Control Panel →

Create Pin

Options:
	•	Search Google Places
	•	Use current location
	•	Drop manually

Fill form → categorize → enable actions → save.

Appears instantly on feed + map.

⸻

9. V1.5 FEATURES THAT ARE PERMITTED BASED ON YOUR REQUEST

✔ People visibility (check-in based)
✔ Feed showing events/activities/trips
✔ Admin pin placement (drag, search, GPS)
✔ User-created events/activities
✔ Waving
✔ Joining
✔ Trips
✔ Region filters
✔ Map with pins
✔ Multi-action bottom sheet
✔ Booking & taxi actions

Everything stays coherent.

⸻

10. FEATURES NOT IN V1.5 (automatically pushed to Phase 2/3)

These would break V1.5 scope:

❌ Real-time GPS tracking
❌ Live dots that follow a user around
❌ Group chats
❌ Social graph (friends/followers)
❌ DMs between users
❌ Algorithmic feed
❌ Stories on map
❌ Proximity alerts
❌ Push-to-join groups
❌ Marketplace posting

These come in later phases.

⸻
