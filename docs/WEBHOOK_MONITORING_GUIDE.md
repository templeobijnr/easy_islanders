# WhatsApp Webhook Monitoring & Setup Guide

## Issue 1: Location Format in WhatsApp Messages

### Problem:
WhatsApp shows "Current location" instead of Google Maps links.

### Root Cause:
The AI is not providing GPS coordinates when calling `dispatchTaxi`. The code supports coordinates, but the AI needs to either:
1. Get user's GPS location from their device
2. Geocode location names to coordinates

### Solution:
The AI must call `dispatchTaxi` with coordinates:
```typescript
{
  pickupLocation: "Kyrenia Marina",
  pickupLat: 35.3369,
  pickupLng: 33.3249,
  destination: "Lapta",
  destinationLat: 35.3500,
  destinationLng: 33.1800
}
```

**Action Required:** Update the AI system prompt to always include coordinates when available.

---

## Issue 2: Firestore Indexes Needed

### Complete List of Required Indexes:

#### 1. **taxiBookings** - For vendor reply matching
```
Collection: taxiBookings
Fields:
  - status (Ascending)
  - createdAt (Ascending)
Query Scope: Collection
```

#### 2. **whatsappMessages** - For monitoring incoming messages
```
Collection: whatsappMessages
Fields:
  - direction (Ascending)
  - from (Ascending)
  - receivedAt (Ascending)
Query Scope: Collection
```

#### 3. **groceryOrders** - For grocery vendor replies
```
Collection: groceryOrders
Fields:
  - status (Ascending)
  - createdAt (Ascending)
Query Scope: Collection
```

#### 4. **serviceRequests** - For service vendor replies
```
Collection: serviceRequests
Fields:
  - status (Ascending)
  - createdAt (Ascending)
Query Scope: Collection
```

#### 5. **chatSessions** - For user's active chats
```
Collection: chatSessions
Fields:
  - userId (Ascending)
  - lastMessageAt (Descending)
Query Scope: Collection
```

**Total: 5 composite indexes**

---

## Issue 3: How to Monitor Webhook Activity

### A. View All WhatsApp Messages

**Option 1: Using the checkWhatsAppMessages script**
```bash
cd functions
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/checkWhatsAppMessages.ts
```

**Option 2: Query Firestore directly**
1. Go to Firebase Console → Firestore
2. Navigate to `whatsappMessages` collection
3. Filter by:
   - `direction == "inbound"` to see incoming messages
   - `direction == "outbound"` to see sent messages

### B. Check Webhook Logs in Real-Time

**Option 1: Firebase Console**
1. Go to Firebase Console → Functions → Logs
2. Filter by function: `api`
3. Look for:
   - `📨 [WhatsApp Webhook] Received message`
   - `✅ [WhatsApp Webhook] Message handled as vendor reply`
   - `ℹ️ [WhatsApp Webhook] Processing as user message`

**Option 2: CLI**
```bash
npx firebase functions:log --only api --limit 50
```

**Option 3: gcloud CLI (more detailed)**
```bash
gcloud functions logs read api --gen2 --region=europe-west1 --limit=50
```

### C. Real-Time Monitoring Dashboard

**Create a simple monitoring script:**

```bash
# Monitor webhook activity live
cd functions
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register -e "
import { db } from './src/config/firebase';

const monitor = db.collection('whatsappMessages')
  .where('direction', '==', 'inbound')
  .orderBy('receivedAt', 'desc')
  .limit(1);

monitor.onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      console.log('🆕 NEW MESSAGE:', {
        from: data.from,
        body: data.body,
        time: data.receivedAt
      });
    }
  });
});

console.log('👀 Monitoring for new messages...');
"
```

---

## Issue 4: How to Know If Replies Are Being Processed

### Check Vendor Reply Processing:

**1. Check if message was saved:**
```bash
cd functions
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register -e "
import { db } from './src/config/firebase';

async function checkLatest() {
  const latest = await db.collection('whatsappMessages')
    .where('direction', '==', 'inbound')
    .orderBy('receivedAt', 'desc')
    .limit(1)
    .get();

  if (!latest.empty) {
    const msg = latest.docs[0].data();
    console.log('Latest inbound:', {
      from: msg.from,
      body: msg.body,
      time: msg.receivedAt
    });
  } else {
    console.log('No inbound messages found');
  }
  process.exit(0);
}
checkLatest();
"
```

**2. Check if booking was updated:**
```bash
cd functions
GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register -e "
import { db } from './src/config/firebase';

async function checkBookings() {
  const bookings = await db.collection('taxiBookings')
    .where('status', '==', 'confirmed')
    .orderBy('driverConfirmedAt', 'desc')
    .limit(3)
    .get();

  console.log(\`Found \${bookings.size} confirmed bookings:\`);
  bookings.forEach(doc => {
    const data = doc.data();
    console.log(\`  - \${doc.id}: \${data.driverLastMessage}\`);
  });
  process.exit(0);
}
checkBookings();
"
```

---

## Complete Workflow: What Happens When You Reply

### 1. **User sends WhatsApp**
```
+905488639394 → "OK, 5 minutes"
```

### 2. **Twilio receives and forwards to webhook**
```
POST https://api-q3nnx3z6ra-ew.a.run.app/v1/whatsapp/webhook

Body: {
  From: "whatsapp:+905488639394",
  Body: "OK, 5 minutes",
  MessageSid: "SM..."
}
```

### 3. **Webhook saves to whatsappMessages**
```firestore
whatsappMessages/ABC123 {
  from: "whatsapp:+905488639394",
  body: "OK, 5 minutes",
  direction: "inbound",
  messageSid: "SM...",
  receivedAt: "2025-11-25T13:40:26.971Z"
}
```

### 4. **Vendor reply handler checks**
```
📨 [WhatsApp Webhook] Received message
🔍 [VendorReply] Checking if +905488639394 is responding...
✅ [VendorReply] Matched to taxiBookings/TAXI-123
```

### 5. **Updates booking**
```firestore
taxiBookings/TAXI-123 {
  status: "pending" → "confirmed",
  driverLastMessage: "OK, 5 minutes",
  driverConfirmedAt: Timestamp
}
```

### 6. **Sends confirmation WhatsApp to customer**
```
→ Customer receives: "Your taxi is confirmed! Driver says: 'OK, 5 minutes'"
```

### 7. **Injects system message to chat**
```firestore
chatSessions/{sessionId}/messages/{msgId} {
  role: "system",
  source: "vendor_reply",
  parts: [{
    text: "TAXI UPDATE: Booking TAXI-123 confirmed..."
  }]
}
```

---

## Debugging Checklist

When a reply doesn't work, check:

- [ ] **Message reached webhook?**
  → Check `whatsappMessages` collection for inbound message

- [ ] **Index exists?**
  → Check Firestore Console → Indexes

- [ ] **Vendor phone matches?**
  → Check if vendor's phone in booking matches reply sender

- [ ] **Booking exists and is pending?**
  → Check `taxiBookings` for pending bookings from that vendor

- [ ] **Keywords detected?**
  → Check if reply contains: "ok", "yes", "confirm", "coming", etc.

- [ ] **Function logs show processing?**
  → Check Firebase Functions logs for vendor reply handler output

---

## Next Steps After Creating Indexes

1. **Create all 5 indexes** (takes ~2 minutes each)
2. **Wait for indexes to finish building**
3. **Send a test message:**
   ```bash
   cd functions
   GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/testTaxiDispatch.ts
   ```
4. **Reply via WhatsApp** with "OK"
5. **Check if booking updated:**
   ```bash
   GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/checkWhatsAppMessages.ts
   ```

---

## Future Enhancements

### 1. **Admin Dashboard**
Create a web UI to view:
- All WhatsApp messages (inbound/outbound)
- Booking statuses
- Vendor response times
- Failed webhooks

### 2. **Retry Logic**
If webhook fails, retry with exponential backoff.

### 3. **Message Templates**
Store common messages as templates for consistency.

### 4. **Analytics**
Track:
- Average vendor response time
- Confirmation rates
- Peak booking times

---

## Quick Commands Reference

```bash
# View recent WhatsApp messages
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/checkWhatsAppMessages.ts

# Test taxi dispatch
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/testTaxiDispatch.ts

# Test vendor reply
cd functions && GCLOUD_PROJECT="easy-islanders" npx ts-node -r esbuild-register src/scripts/testVendorReply.ts

# View function logs
npx firebase functions:log --only api --limit 50

# Monitor in real-time
gcloud functions logs read api --gen2 --region=europe-west1 --follow
```
