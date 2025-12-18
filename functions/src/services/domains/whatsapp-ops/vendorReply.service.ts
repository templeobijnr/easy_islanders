import * as logger from "firebase-functions/logger";
import { db } from "../../../config/firebase";
import { sendWhatsApp } from "../../twilio.service";
import { FieldValue } from "firebase-admin/firestore";

// Keywords to detect intent
const CONFIRM_KEYWORDS = [
  "yes",
  "ok",
  "okay",
  "confirm",
  "coming",
  "on the way",
  "on my way",
  "kabul",
  "tamam",
  "accepted",
  "accept",
];
const REJECT_KEYWORDS = [
  "no",
  "sorry",
  "busy",
  "ret",
  "hayır",
  "cannot",
  "cant",
  "decline",
];
const ARRIVED_KEYWORDS = ["arrived", "here", "outside", "geldim", "buradayım"];
const COMPLETED_KEYWORDS = [
  "done",
  "completed",
  "finished",
  "delivered",
  "bitti",
  "tamamlandı",
];

/**
 * Main interceptor: Checks if incoming WhatsApp is from a vendor responding to an order
 * Returns true if the message was handled as a vendor reply, false otherwise
 */
export const handleVendorReply = async (
  vendorPhone: string,
  messageBody: string,
): Promise<boolean> => {
  const normalizedMsg = messageBody.trim().toLowerCase();
  const cleanPhone = vendorPhone.replace("whatsapp:", "");

  logger.debug(
    `🔍 [VendorReply] Checking if ${cleanPhone} is responding to an order...`,
  );

  // 1. CHECK TAXI BOOKINGS (Legacy dispatchTaxi)
  const taxiHandled = await checkTaxiBookings(
    cleanPhone,
    normalizedMsg,
    messageBody,
  );
  if (taxiHandled) return true;

  // 2. CHECK TAXI REQUESTS (New requestTaxi system)
  const taxiRequestHandled = await checkTaxiRequests(
    cleanPhone,
    normalizedMsg,
    messageBody,
  );
  if (taxiRequestHandled) return true;

  // 3. CHECK GROCERY ORDERS
  const groceryHandled = await checkGroceryOrders(
    cleanPhone,
    normalizedMsg,
    messageBody,
  );
  if (groceryHandled) return true;

  // 4. CHECK SERVICE REQUESTS
  const serviceHandled = await checkServiceRequests(
    cleanPhone,
    normalizedMsg,
    messageBody,
  );
  if (serviceHandled) return true;

  logger.debug(
    `ℹ️ [VendorReply] Message from ${cleanPhone} is not a vendor reply - treating as user message`,
  );
  return false;
};

/**
 * Check if this is a taxi driver responding (Legacy dispatchTaxi)
 */
async function checkTaxiBookings(
  vendorPhone: string,
  normalizedMsg: string,
  messageBody: string,
): Promise<boolean> {
  const taxiQuery = await db
    .collection("taxiBookings")
    .where("status", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(5)
    .get();

  // Find bookings where the vendor phone matches the taxi listing's agentPhone
  for (const bookingDoc of taxiQuery.docs) {
    const booking = bookingDoc.data();

    // Check if this booking's taxi listing has this phone number
    if (!booking.taxiListingId) continue;

    const taxiListing = await db
      .collection("listings")
      .doc(booking.taxiListingId)
      .get();
    if (!taxiListing.exists) continue;

    const taxiData = taxiListing.data();
    const taxiPhone = (taxiData?.agentPhone || "").replace("whatsapp:", "");

    if (taxiPhone !== vendorPhone) continue;

    // This is the driver! Handle their response
    logger.debug(
      `🚕 [VendorReply] Taxi driver ${vendorPhone} responding to booking ${bookingDoc.id}`,
    );

    if (CONFIRM_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await confirmTaxiBooking(bookingDoc.id, booking, messageBody);
      return true;
    }

    if (REJECT_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await rejectTaxiBooking(bookingDoc.id, booking, messageBody);
      return true;
    }

    if (ARRIVED_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await updateTaxiStatus(bookingDoc.id, booking, "arrived", messageBody);
      return true;
    }

    if (COMPLETED_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await updateTaxiStatus(bookingDoc.id, booking, "completed", messageBody);
      return true;
    }

    // Generic update
    await updateTaxiStatus(bookingDoc.id, booking, "updated", messageBody);
    return true;
  }

  return false;
}

/**
 * Check if this is a taxi driver responding (New requestTaxi system)
 */
async function checkTaxiRequests(
  vendorPhone: string,
  normalizedMsg: string,
  messageBody: string,
): Promise<boolean> {
  // The taxi service already handles this via its own webhook at /taxi/webhook
  // We don't need to duplicate the logic here, but we should check if there's an active request
  const taxiRequestQuery = await db
    .collection("taxiRequests")
    .where("status", "in", ["pending", "accepted"])
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  for (const requestDoc of taxiRequestQuery.docs) {
    const request = requestDoc.data();

    // Check if this driver was broadcast to
    if (!request.broadcastSentTo || !Array.isArray(request.broadcastSentTo))
      continue;

    // Get driver info to check phone
    for (const driverId of request.broadcastSentTo) {
      const driverDoc = await db.collection("taxiDrivers").doc(driverId).get();
      if (!driverDoc.exists) continue;

      const driver = driverDoc.data();
      const driverPhone = (driver?.phone || "").replace("whatsapp:", "");

      if (driverPhone === vendorPhone) {
        logger.debug(
          `🚕 [VendorReply] Taxi driver ${vendorPhone} responding to request ${requestDoc.id}`,
        );
        // This is handled by the taxi.service.ts already, but we acknowledge it here
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if this is a market/grocery vendor responding
 */
async function checkGroceryOrders(
  vendorPhone: string,
  normalizedMsg: string,
  messageBody: string,
): Promise<boolean> {
  const groceryQuery = await db
    .collection("groceryOrders")
    .where("status", "in", ["pending", "confirmed"])
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  for (const orderDoc of groceryQuery.docs) {
    const order = orderDoc.data();
    const vendorPhoneInOrder = (order.vendorPhone || "").replace(
      "whatsapp:",
      "",
    );

    if (vendorPhoneInOrder !== vendorPhone) continue;

    // This is the vendor! Handle their response
    logger.debug(
      `🛒 [VendorReply] Market vendor ${vendorPhone} responding to order ${orderDoc.id}`,
    );

    if (CONFIRM_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await confirmGroceryOrder(orderDoc.id, order, messageBody);
      return true;
    }

    if (REJECT_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await rejectGroceryOrder(orderDoc.id, order, messageBody);
      return true;
    }

    if (
      COMPLETED_KEYWORDS.some((k) => normalizedMsg.includes(k)) ||
      normalizedMsg.includes("delivered")
    ) {
      await updateGroceryStatus(orderDoc.id, order, "delivered", messageBody);
      return true;
    }

    // Generic update
    await updateGroceryStatus(orderDoc.id, order, "processing", messageBody);
    return true;
  }

  return false;
}

/**
 * Check if this is a service provider responding
 */
async function checkServiceRequests(
  vendorPhone: string,
  normalizedMsg: string,
  messageBody: string,
): Promise<boolean> {
  const serviceQuery = await db
    .collection("serviceRequests")
    .where("status", "in", ["pending", "confirmed"])
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  for (const requestDoc of serviceQuery.docs) {
    const request = requestDoc.data();
    const providerPhone = (request.providerPhone || "").replace(
      "whatsapp:",
      "",
    );

    if (providerPhone !== vendorPhone) continue;

    // This is the provider! Handle their response
    logger.debug(
      `🔧 [VendorReply] Service provider ${vendorPhone} responding to request ${requestDoc.id}`,
    );

    if (CONFIRM_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await confirmServiceRequest(requestDoc.id, request, messageBody);
      return true;
    }

    if (REJECT_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await rejectServiceRequest(requestDoc.id, request, messageBody);
      return true;
    }

    if (COMPLETED_KEYWORDS.some((k) => normalizedMsg.includes(k))) {
      await updateServiceStatus(
        requestDoc.id,
        request,
        "completed",
        messageBody,
      );
      return true;
    }

    // Generic update
    await updateServiceStatus(
      requestDoc.id,
      request,
      "in_progress",
      messageBody,
    );
    return true;
  }

  return false;
}

// ============================================
// TAXI BOOKING HANDLERS (Legacy dispatchTaxi)
// ============================================

async function confirmTaxiBooking(
  bookingId: string,
  booking: any,
  vendorMsg: string,
) {
  logger.debug(`✅ [VendorReply] Confirming taxi booking ${bookingId}`);

  // A. Update Firestore State
  await db.collection("taxiBookings").doc(bookingId).update({
    status: "confirmed",
    driverLastMessage: vendorMsg,
    driverConfirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // B. Notify User via WhatsApp
  const userMsg = `🚕 *Taxi Confirmed!*\n\nDriver says: "${vendorMsg}"\n\nPickup: ${booking.pickupLocation}\nDestination: ${booking.destination}\n\nYour driver will arrive soon!`;
  if (booking.customerContact) {
    await sendWhatsApp(booking.customerContact, userMsg);
  }

  // C. Update Agent Context (Inject System Message)
  await injectSystemMessage(
    booking.userId,
    `TAXI UPDATE: Booking ${bookingId} confirmed. Driver replied: "${vendorMsg}". Status changed to 'confirmed'.`,
  );
}

async function rejectTaxiBooking(
  bookingId: string,
  booking: any,
  vendorMsg: string,
) {
  logger.debug(`❌ [VendorReply] Taxi booking ${bookingId} rejected`);

  await db.collection("taxiBookings").doc(bookingId).update({
    status: "rejected",
    driverLastMessage: vendorMsg,
    driverRejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userMsg = `❌ *Taxi Update*\n\nDriver responded: "${vendorMsg}"\n\nWe'll find you another driver shortly.`;
  if (booking.customerContact) {
    await sendWhatsApp(booking.customerContact, userMsg);
  }

  await injectSystemMessage(
    booking.userId,
    `TAXI UPDATE: Booking ${bookingId} rejected. Driver replied: "${vendorMsg}". Finding alternative driver...`,
  );
}

async function updateTaxiStatus(
  bookingId: string,
  booking: any,
  status: string,
  vendorMsg: string,
) {
  logger.debug(
    `🔄 [VendorReply] Updating taxi booking ${bookingId} to status: ${status}`,
  );

  await db.collection("taxiBookings").doc(bookingId).update({
    status,
    driverLastMessage: vendorMsg,
    lastUpdateAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const statusEmoji =
    status === "arrived" ? "📍" : status === "completed" ? "✅" : "🚕";
  const userMsg = `${statusEmoji} *Taxi Update*\n\nDriver: "${vendorMsg}"`;
  if (booking.customerContact) {
    await sendWhatsApp(booking.customerContact, userMsg);
  }

  await injectSystemMessage(
    booking.userId,
    `TAXI UPDATE: Booking ${bookingId} status changed to '${status}'. Driver: "${vendorMsg}"`,
  );
}

// ============================================
// GROCERY ORDER HANDLERS
// ============================================

async function confirmGroceryOrder(
  orderId: string,
  order: any,
  vendorMsg: string,
) {
  logger.debug(`✅ [VendorReply] Confirming grocery order ${orderId}`);

  await db.collection("groceryOrders").doc(orderId).update({
    status: "confirmed",
    vendorLastMessage: vendorMsg,
    vendorConfirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userMsg = `🛒 *Order Confirmed!*\n\nMarket says: "${vendorMsg}"\n\nItems: ${order.items}\nDelivery to: ${order.deliveryAddress}`;
  if (order.customerContact) {
    await sendWhatsApp(order.customerContact, userMsg);
  }

  await injectSystemMessage(
    order.userId,
    `GROCERY UPDATE: Order ${orderId} confirmed by vendor. Message: "${vendorMsg}". Status: confirmed.`,
  );
}

async function rejectGroceryOrder(
  orderId: string,
  order: any,
  vendorMsg: string,
) {
  logger.debug(`❌ [VendorReply] Grocery order ${orderId} rejected`);

  await db.collection("groceryOrders").doc(orderId).update({
    status: "rejected",
    vendorLastMessage: vendorMsg,
    vendorRejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userMsg = `❌ *Order Update*\n\nMarket responded: "${vendorMsg}"\n\nWe'll help you find alternatives.`;
  if (order.customerContact) {
    await sendWhatsApp(order.customerContact, userMsg);
  }

  await injectSystemMessage(
    order.userId,
    `GROCERY UPDATE: Order ${orderId} rejected. Vendor: "${vendorMsg}".`,
  );
}

async function updateGroceryStatus(
  orderId: string,
  order: any,
  status: string,
  vendorMsg: string,
) {
  logger.debug(
    `🔄 [VendorReply] Updating grocery order ${orderId} to status: ${status}`,
  );

  await db.collection("groceryOrders").doc(orderId).update({
    status,
    vendorLastMessage: vendorMsg,
    lastUpdateAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const statusEmoji =
    status === "delivered" ? "✅" : status === "processing" ? "🔄" : "🛒";
  const userMsg = `${statusEmoji} *Order Update*\n\nMarket: "${vendorMsg}"`;
  if (order.customerContact) {
    await sendWhatsApp(order.customerContact, userMsg);
  }

  await injectSystemMessage(
    order.userId,
    `GROCERY UPDATE: Order ${orderId} status changed to '${status}'. Vendor: "${vendorMsg}"`,
  );
}

// ============================================
// SERVICE REQUEST HANDLERS
// ============================================

async function confirmServiceRequest(
  requestId: string,
  request: any,
  vendorMsg: string,
) {
  logger.debug(`✅ [VendorReply] Confirming service request ${requestId}`);

  await db.collection("serviceRequests").doc(requestId).update({
    status: "confirmed",
    providerLastMessage: vendorMsg,
    providerConfirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userMsg = `🔧 *Service Confirmed!*\n\nProvider says: "${vendorMsg}"\n\nService: ${request.serviceType}\nLocation: ${request.location}`;
  if (request.customerContact) {
    await sendWhatsApp(request.customerContact, userMsg);
  }

  await injectSystemMessage(
    request.userId,
    `SERVICE UPDATE: Request ${requestId} confirmed by provider. Message: "${vendorMsg}". Status: confirmed.`,
  );
}

async function rejectServiceRequest(
  requestId: string,
  request: any,
  vendorMsg: string,
) {
  logger.debug(`❌ [VendorReply] Service request ${requestId} rejected`);

  await db.collection("serviceRequests").doc(requestId).update({
    status: "rejected",
    providerLastMessage: vendorMsg,
    providerRejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userMsg = `❌ *Service Update*\n\nProvider responded: "${vendorMsg}"\n\nWe'll help you find another provider.`;
  if (request.customerContact) {
    await sendWhatsApp(request.customerContact, userMsg);
  }

  await injectSystemMessage(
    request.userId,
    `SERVICE UPDATE: Request ${requestId} rejected. Provider: "${vendorMsg}".`,
  );
}

async function updateServiceStatus(
  requestId: string,
  request: any,
  status: string,
  vendorMsg: string,
) {
  logger.debug(
    `🔄 [VendorReply] Updating service request ${requestId} to status: ${status}`,
  );

  await db.collection("serviceRequests").doc(requestId).update({
    status,
    providerLastMessage: vendorMsg,
    lastUpdateAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const statusEmoji =
    status === "completed" ? "✅" : status === "in_progress" ? "🔄" : "🔧";
  const userMsg = `${statusEmoji} *Service Update*\n\nProvider: "${vendorMsg}"`;
  if (request.customerContact) {
    await sendWhatsApp(request.customerContact, userMsg);
  }

  await injectSystemMessage(
    request.userId,
    `SERVICE UPDATE: Request ${requestId} status changed to '${status}'. Provider: "${vendorMsg}"`,
  );
}

// ============================================
// HELPER: Inject System Message into Chat
// ============================================

async function injectSystemMessage(userId: string, content: string) {
  if (!userId || userId === "guest") return;

  try {
    // Get or create the user's default session
    const sessionId = `sess_${userId}_${Date.now()}`;
    const sessionQuery = await db
      .collection("chatSessions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .orderBy("lastMessageAt", "desc")
      .limit(1)
      .get();

    let actualSessionId = sessionId;
    if (!sessionQuery.empty) {
      actualSessionId = sessionQuery.docs[0].id;
    }

    // Add system message to the session
    await db
      .collection("chatSessions")
      .doc(actualSessionId)
      .collection("messages")
      .add({
        role: "system",
        parts: [{ text: content }],
        userId,
        agentId: "agent_default",
        timestamp: new Date().toISOString(),
        source: "vendor_reply",
      });

    // Update session timestamp
    await db.collection("chatSessions").doc(actualSessionId).set(
      {
        id: actualSessionId,
        userId,
        agentId: "agent_default",
        lastMessageAt: new Date().toISOString(),
        status: "active",
      },
      { merge: true },
    );

    logger.debug(
      `💬 [VendorReply] Injected system message to session ${actualSessionId}`,
    );
  } catch (error) {
    console.error(`❌ [VendorReply] Failed to inject system message:`, error);
  }
}
