# Complete Notification System Implementation Plan

## 🎯 Goal: Full Bi-Directional Communication System

**User Flow:**
1. User: "I want a taxi"
2. LLM: Gets user's location
3. System: Sends WhatsApp to taxi driver
4. Driver: Replies "OK, 5 minutes"
5. System: **Triggers 3 notifications:**
   - ✅ WhatsApp to customer
   - ✅ In-app notification
   - ✅ Chat context update (system message)

---

## 📊 Current Status

### ✅ What's Working:
1. **Webhook receiving messages** - All vendor replies are stored
2. **WhatsApp sending** - Outbound messages work
3. **Vendor reply detection** - Code exists to match replies to bookings
4. **Chat context injection** - System messages can be added to chats

### ❌ What's Missing:
1. **Firestore indexes** - Vendor reply queries fail
2. **Message categorization** - Hard to track message threads
3. **In-app notifications** - No notification system yet
4. **User presence tracking** - Don't know if user is online
5. **GPS location handling** - AI doesn't provide coordinates

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Initiates                           │
│         "I want a taxi from Marina to Lapta"                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Chat Agent (Gemini)                     │
│  1. Extracts: pickup="Marina", destination="Lapta"          │
│  2. Gets GPS: lat=35.33, lng=33.32                          │
│  3. Calls: dispatchTaxi(pickup, destination, lat, lng)     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Dispatch Service (toolService.ts)             │
│  1. Finds best taxi (location matching)                     │
│  2. Creates booking in taxiBookings collection              │
│  3. Sends WhatsApp to driver                                │
│  4. Stores message in whatsappMessages                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Driver Receives WhatsApp                   │
│  "🚖 New Booking: Marina → Lapta                           │
│   📲 TAP TO NAVIGATE: [Google Maps Link]"                  │
│                                                             │
│  Driver replies: "OK, 5 minutes"                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Twilio → WhatsApp Webhook (routes/index.ts)       │
│  1. Receives: From=+905488639394, Body="OK, 5 minutes"     │
│  2. Saves to whatsappMessages (direction: inbound)          │
│  3. Calls: handleVendorReply(phone, message)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Vendor Reply Handler (vendorReply.service.ts)        │
│  1. Finds pending booking from +905488639394                │
│  2. Updates: status → "confirmed"                           │
│  3. Triggers 3 notifications →                              │
└─────┬───────────────┬────────────────┬──────────────────────┘
      │               │                │
      ▼               ▼                ▼
┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
│  WhatsApp   │ │   In-App     │ │  Chat Context   │
│ Notification│ │ Notification │ │  Update         │
│             │ │              │ │                 │
│ Customer    │ │ Push to user │ │ System message  │
│ receives:   │ │ device       │ │ injected        │
│ "Confirmed! │ │              │ │                 │
│  5 minutes" │ │              │ │                 │
└─────────────┘ └──────────────┘ └─────────────────┘
```

---

## 📋 Implementation Plan (Step-by-Step)

### **Phase 1: Foundation (Week 1)** ⚡ PRIORITY

#### Step 1.1: Create Firestore Indexes (5 indexes)
**Status:** ❌ Blocking everything else

**Action:**
```
Go to Firebase Console and create these indexes:

1. taxiBookings (status ASC, createdAt ASC)
2. whatsappMessages (direction ASC, from ASC, receivedAt ASC)
3. groceryOrders (status ASC, createdAt ASC)
4. serviceRequests (status ASC, createdAt ASC)
5. chatSessions (userId ASC, lastMessageAt DESC)
```

**Time:** 2 minutes to create, 2 minutes per index to build

---

#### Step 1.2: Enhance Message Categorization
**Status:** ❌ Missing

**Current whatsappMessages schema:**
```typescript
{
  from: string,
  to: string,
  body: string,
  direction: "inbound" | "outbound",
  messageSid: string,
  receivedAt: string
}
```

**Enhanced schema:**
```typescript
{
  // Existing fields
  from: string,
  to: string,
  body: string,
  direction: "inbound" | "outbound",
  messageSid: string,
  receivedAt: string,

  // NEW FIELDS:
  messageType: "booking_request" | "vendor_reply" | "confirmation" | "general",
  relatedTo: {
    collection: "taxiBookings" | "groceryOrders" | "serviceRequests",
    id: string  // e.g., "TAXI-1764076118833"
  },
  sender: {
    type: "customer" | "vendor" | "system",
    userId?: string,  // If customer
    vendorPhone?: string,  // If vendor
    vendorName?: string  // Taxi name
  },
  status: "sent" | "delivered" | "read" | "failed",
  thread?: string,  // Group related messages
  metadata: {
    bookingStatus?: "pending" | "confirmed" | "completed" | "cancelled",
    notificationsSent?: string[],  // ["whatsapp", "in_app", "chat"]
  }
}
```

**Implementation:**
Update `twilio.service.ts` and `vendorReply.service.ts` to save enhanced metadata.

**File:** `functions/src/services/twilio.service.ts`

---

#### Step 1.3: Fix GPS Location Handling
**Status:** ❌ AI not providing coordinates

**Problem:** WhatsApp shows "Current location" instead of map links

**Solution:** Update AI system prompt to ALWAYS get GPS coordinates

**File:** `functions/src/utils/systemPrompts.ts`

Add this to `COMMON_TOOLS`:
```typescript
LOCATION HANDLING (CRITICAL):
When a user requests a taxi or delivery:
1. ALWAYS ask for their current location using their device GPS
2. If they provide an address, use geocoding to get coordinates
3. NEVER call dispatchTaxi without pickupLat/pickupLng
4. Include coordinates in ALL location-based tool calls

Example:
User: "I need a taxi to the harbor"
AI: "I'll help you book a taxi. First, can you share your current location?"
   → [User shares location or address]
AI: [Calls dispatchTaxi with pickupLat, pickupLng, destinationLat, destinationLng]
```

---

### **Phase 2: Notification System (Week 1-2)**

#### Step 2.1: Create Notification Service
**Status:** ❌ Doesn't exist yet

**File:** `functions/src/services/notification.service.ts`

```typescript
import { db } from '../config/firebase';
import { sendWhatsApp } from './twilio.service';
import admin from 'firebase-admin';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channels: ('whatsapp' | 'push' | 'chat')[];
  relatedTo?: {
    collection: string;
    id: string;
  };
}

/**
 * Multi-channel notification dispatcher
 */
export async function sendNotification(payload: NotificationPayload) {
  const results: Record<string, boolean> = {};

  // 1. WHATSAPP NOTIFICATION
  if (payload.channels.includes('whatsapp')) {
    try {
      const user = await db.collection('users').doc(payload.userId).get();
      const userData = user.data();
      const phone = userData?.phone;

      if (phone) {
        const message = `*${payload.title}*\n\n${payload.body}`;
        await sendWhatsApp(phone, message);
        results.whatsapp = true;
        console.log(`✅ [Notification] WhatsApp sent to ${phone}`);
      } else {
        console.log(`⚠️ [Notification] User ${payload.userId} has no phone`);
        results.whatsapp = false;
      }
    } catch (error) {
      console.error('❌ [Notification] WhatsApp failed:', error);
      results.whatsapp = false;
    }
  }

  // 2. IN-APP PUSH NOTIFICATION (FCM)
  if (payload.channels.includes('push')) {
    try {
      const user = await db.collection('users').doc(payload.userId).get();
      const userData = user.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length > 0) {
        const message = {
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          tokens: fcmTokens,
        };

        const response = await admin.messaging().sendMulticast(message);
        results.push = response.successCount > 0;
        console.log(`✅ [Notification] Push sent to ${response.successCount}/${fcmTokens.length} devices`);
      } else {
        console.log(`⚠️ [Notification] User ${payload.userId} has no FCM tokens`);
        results.push = false;
      }
    } catch (error) {
      console.error('❌ [Notification] Push failed:', error);
      results.push = false;
    }
  }

  // 3. CHAT CONTEXT INJECTION (System Message)
  if (payload.channels.includes('chat')) {
    try {
      await injectSystemMessage(payload.userId, payload.body, payload.relatedTo);
      results.chat = true;
      console.log(`✅ [Notification] Chat message injected for user ${payload.userId}`);
    } catch (error) {
      console.error('❌ [Notification] Chat injection failed:', error);
      results.chat = false;
    }
  }

  // Store notification log
  await db.collection('notifications').add({
    userId: payload.userId,
    title: payload.title,
    body: payload.body,
    channels: payload.channels,
    results,
    relatedTo: payload.relatedTo,
    sentAt: new Date().toISOString(),
  });

  return results;
}

/**
 * Inject system message into user's active chat session
 */
async function injectSystemMessage(
  userId: string,
  message: string,
  relatedTo?: { collection: string; id: string }
) {
  // Find user's most recent chat session
  const chatSessionsSnap = await db
    .collection('chatSessions')
    .where('userId', '==', userId)
    .orderBy('lastMessageAt', 'desc')
    .limit(1)
    .get();

  if (chatSessionsSnap.empty) {
    console.log(`⚠️ [Notification] No active chat session for user ${userId}`);
    return;
  }

  const sessionId = chatSessionsSnap.docs[0].id;

  // Add system message to chat
  await db
    .collection('chatSessions')
    .doc(sessionId)
    .collection('messages')
    .add({
      role: 'system',
      source: 'vendor_reply',
      parts: [{ text: message }],
      timestamp: new Date().toISOString(),
      relatedTo,
    });

  // Update session's lastMessageAt
  await db.collection('chatSessions').doc(sessionId).update({
    lastMessageAt: new Date().toISOString(),
  });

  console.log(`✅ [Notification] System message added to chat session ${sessionId}`);
}
```

---

#### Step 2.2: Update Vendor Reply Handler to Use Notifications
**Status:** ⚠️ Partially implemented

**File:** `functions/src/services/vendorReply.service.ts`

Update the `checkTaxiBookings` function to trigger notifications:

```typescript
// After updating booking status to 'confirmed'
await sendNotification({
  userId: booking.userId,
  title: 'Taxi Confirmed!',
  body: `Your taxi (${booking.taxiInfo?.name}) confirmed! Driver said: "${messageBody}"`,
  channels: ['whatsapp', 'push', 'chat'],
  relatedTo: {
    collection: 'taxiBookings',
    id: bookingId,
  },
  data: {
    bookingId,
    type: 'taxi_confirmed',
    driverMessage: messageBody,
  },
});
```

---

#### Step 2.3: Add FCM Token Storage
**Status:** ❌ Missing

**Frontend Update:** When user logs in or opens app, save FCM token

**File:** `services/firebaseConfig.ts` (frontend)

```typescript
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export async function registerFCMToken(userId: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY',
    });

    // Save token to user document
    await db.collection('users').doc(userId).update({
      fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
      lastTokenUpdate: new Date().toISOString(),
    });

    console.log('✅ FCM token registered:', token);

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('📬 Notification received:', payload);
      // Show in-app notification
      showInAppNotification(payload);
    });
  } catch (error) {
    console.error('❌ FCM registration failed:', error);
  }
}
```

---

### **Phase 3: Testing & Refinement (Week 2)**

#### Step 3.1: End-to-End Testing Script
**File:** `functions/src/scripts/testFullFlow.ts`

```typescript
/**
 * Complete end-to-end test:
 * 1. Create taxi booking
 * 2. Send WhatsApp to driver
 * 3. Simulate driver reply
 * 4. Verify all 3 notifications triggered
 */
import { toolResolvers } from '../services/toolService';
import { handleVendorReply } from '../services/vendorReply.service';
import { db } from '../config/firebase';

async function testFullFlow() {
  console.log('🧪 FULL FLOW TEST\n');

  // Step 1: Dispatch taxi
  console.log('📤 Step 1: Dispatching taxi...');
  const result = await toolResolvers.dispatchTaxi(
    {
      pickupLocation: 'Kyrenia Marina',
      destination: 'Lapta',
      pickupLat: 35.3369,
      pickupLng: 33.3249,
      destinationLat: 35.3500,
      destinationLng: 33.1800,
      customerContact: 'whatsapp:+905488639394',
      customerName: 'Test User',
    },
    'test-user-123'
  );

  console.log(`✅ Booking created: ${result.booking.id}\n`);

  // Step 2: Wait 5 seconds for WhatsApp delivery
  console.log('⏳ Waiting 5 seconds for WhatsApp delivery...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 3: Simulate vendor reply
  console.log('💬 Step 3: Simulating vendor reply...');
  const vendorHandled = await handleVendorReply(
    'whatsapp:+905488639394',
    'OK, 5 minutes'
  );

  if (!vendorHandled) {
    console.error('❌ Vendor reply NOT handled');
    process.exit(1);
  }

  console.log('✅ Vendor reply handled\n');

  // Step 4: Verify notifications sent
  console.log('🔍 Step 4: Verifying notifications...\n');

  const booking = await db.collection('taxiBookings').doc(result.booking.id).get();
  const bookingData = booking.data();

  console.log('📊 Booking Status:', bookingData?.status);
  console.log('💬 Driver Message:', bookingData?.driverLastMessage);
  console.log('⏰ Confirmed At:', bookingData?.driverConfirmedAt?.toDate());

  // Check notifications collection
  const notifications = await db
    .collection('notifications')
    .where('relatedTo.id', '==', result.booking.id)
    .get();

  console.log(`\n📬 Notifications sent: ${notifications.size}`);
  notifications.forEach((doc) => {
    const notif = doc.data();
    console.log(`   - ${notif.title}: ${JSON.stringify(notif.results)}`);
  });

  // Check chat messages
  const chatSessions = await db
    .collection('chatSessions')
    .where('userId', '==', 'test-user-123')
    .get();

  if (!chatSessions.empty) {
    const sessionId = chatSessions.docs[0].id;
    const systemMessages = await db
      .collection('chatSessions')
      .doc(sessionId)
      .collection('messages')
      .where('source', '==', 'vendor_reply')
      .get();

    console.log(`\n💬 System messages in chat: ${systemMessages.size}`);
  }

  console.log('\n✅ FULL FLOW TEST COMPLETE\n');
  process.exit(0);
}

if (require.main === module) {
  testFullFlow().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
```

---

## 🎯 Priority Order

### **IMMEDIATE (Do First):**
1. ✅ Create 5 Firestore indexes
2. ✅ Test webhook with existing code
3. ✅ Verify vendor reply matching works

### **HIGH PRIORITY (This Week):**
4. 🔧 Implement `notification.service.ts`
5. 🔧 Update `vendorReply.service.ts` to trigger notifications
6. 🔧 Enhance `whatsappMessages` schema with categorization
7. 🔧 Update AI system prompt for GPS handling

### **MEDIUM PRIORITY (Next Week):**
8. 📱 Add FCM token registration (frontend)
9. 📱 Implement in-app notification UI
10. 🧪 Create end-to-end testing script
11. 📊 Build admin dashboard to view messages

### **FUTURE ENHANCEMENTS:**
12. 🔔 User notification preferences
13. 📈 Analytics dashboard
14. 🔄 Retry logic for failed notifications
15. 🌐 Multi-language support

---

## 📝 Checklist: Getting System Fully Functional

### Phase 1: Foundation ✅
- [ ] Create `taxiBookings` index
- [ ] Create `whatsappMessages` index
- [ ] Create `groceryOrders` index
- [ ] Create `serviceRequests` index
- [ ] Create `chatSessions` index
- [ ] Test webhook receives messages
- [ ] Test vendor reply handler (after indexes)

### Phase 2: Notifications 🔔
- [ ] Create `notification.service.ts`
- [ ] Implement multi-channel dispatcher
- [ ] Update `vendorReply.service.ts` to use notifications
- [ ] Add FCM token storage to users
- [ ] Test WhatsApp notifications
- [ ] Test push notifications
- [ ] Test chat context injection

### Phase 3: Location & Categorization 📍
- [ ] Update AI system prompt for GPS
- [ ] Test AI provides coordinates
- [ ] Enhance `whatsappMessages` schema
- [ ] Update message saving logic
- [ ] Add message thread tracking

### Phase 4: Testing & Polish ✨
- [ ] Run `testFullFlow.ts`
- [ ] Verify end-to-end flow
- [ ] Test with real user
- [ ] Monitor Firebase logs
- [ ] Create monitoring dashboard

---

## 🚀 Quick Start (Today)

### 1. Create Indexes (5 minutes)
Go to Firebase Console and create the 5 indexes listed in Phase 1.

### 2. Test Current System (2 minutes)
```bash
cd functions
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/testTaxiDispatch.ts
```

Reply via WhatsApp with "OK"

### 3. Check if it worked (1 minute)
```bash
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/checkWhatsAppMessages.ts
```

Look for:
- ✅ Message received
- ✅ Booking status changed to "confirmed"
- ✅ Driver message stored

### 4. If it worked, move to Phase 2
Create the `notification.service.ts` file.

---

## 📞 Support Commands

```bash
# View all messages
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/checkWhatsAppMessages.ts

# Test full flow
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/testFullFlow.ts

# Monitor webhook in real-time
npx firebase functions:log --only api --follow

# Check notification logs
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register -e "
import { db } from './src/config/firebase';
async function check() {
  const notifs = await db.collection('notifications').orderBy('sentAt', 'desc').limit(10).get();
  notifs.forEach(doc => console.log(doc.data()));
  process.exit(0);
}
check();
"
```

---

## Summary

**To get the system fully functional:**

1. **Create indexes** ← BLOCKING EVERYTHING
2. **Build notification service** ← Core functionality
3. **Update AI prompts** ← Fix GPS issue
4. **Test end-to-end** ← Verify it all works

Once indexes are created and notification service is built, the complete flow will work:
```
User → AI → Taxi Driver → Webhook → 3 Notifications → User
```

**Start now:** Create those 5 indexes! 🚀
