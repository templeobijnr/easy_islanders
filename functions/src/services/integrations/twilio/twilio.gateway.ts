import * as logger from "firebase-functions/logger";
import twilio from "twilio";
import { db } from "../../../config/firebase";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || "";

// Lazily create client to avoid throwing if envs missing during tests
let client: twilio.Twilio | null = null;

function getClient() {
  if (!client) {
    if (!accountSid || !accountSid.startsWith("AC")) {
      throw new Error("Twilio account SID missing/invalid");
    }
    if (!authToken) {
      throw new Error("Twilio auth token missing");
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendWhatsApp(
  to: string,
  body: string,
  context?: { bookingId?: string; stayId?: string; role?: string },
) {
  if (
    !accountSid ||
    !authToken ||
    !fromWhatsApp ||
    !accountSid.startsWith("AC")
  ) {
    throw new Error("Twilio WhatsApp not configured");
  }

  const normalizedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  // Log outbound attempt with a short preview
  logger.debug("📤 [WhatsApp] Sending message", {
    from: fromWhatsApp,
    to: normalizedTo,
    preview: body.length > 200 ? `${body.slice(0, 200)}…` : body,
  });

  const cli = getClient();
  const message = await cli.messages.create({
    from: fromWhatsApp,
    to: normalizedTo,
    body,
  });

  // Persist outbound message for debugging / tracing
  try {
    await db.collection("whatsappMessages").add({
      from: fromWhatsApp,
      to: normalizedTo,
      body,
      direction: "outbound",
      messageSid: message.sid,
      status: message.status,
      sentAt: new Date().toISOString(),
      bookingId: context?.bookingId || null,
      stayId: context?.stayId || null,
      role: context?.role || null,
    });
  } catch (err) {
    console.error(
      "⚠️ [WhatsApp] Failed to persist outbound message log:",
      (err as any)?.message || err,
    );
  }

  logger.debug("✅ [WhatsApp] Message sent", {
    to: normalizedTo,
    sid: message.sid,
    status: message.status,
  });

  return {
    sid: message.sid,
    status: message.status,
  };
}

export async function sendTaxiRequest(
  to: string,
  payload: {
    customerContact: string;
    customerName?: string;
    pickup: string;
    destination: string;
    pickupTime?: string;
    notes?: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationLat?: number;
    destinationLng?: number;
  },
) {
  let body = `🚖 *New Taxi Booking Request*\n\n`;
  body += `👤 Customer: ${payload.customerName || "Guest"}\n`;
  body += `📱 Contact: ${payload.customerContact}\n\n`;

  // Pickup location with prominent map link
  body += `📍 *PICKUP LOCATION:*\n`;
  body += `${payload.pickup}\n`;
  if (payload.pickupLat && payload.pickupLng) {
    // Use Google Maps navigation URL - opens directly in navigation mode
    body += `📲 *TAP TO NAVIGATE:*\n`;
    body += `https://www.google.com/maps/dir/?api=1&destination=${payload.pickupLat},${payload.pickupLng}\n\n`;
  } else {
    body += `\n`;
  }

  // Destination with map link
  body += `🎯 *DESTINATION:*\n`;
  body += `${payload.destination}\n`;
  if (payload.destinationLat && payload.destinationLng) {
    body += `📲 *TAP TO NAVIGATE:*\n`;
    body += `https://www.google.com/maps/dir/?api=1&destination=${payload.destinationLat},${payload.destinationLng}\n`;
  }

  if (payload.pickupTime) {
    body += `\n🕐 *Time:* ${payload.pickupTime}`;
  }
  if (payload.notes) {
    body += `\n\n💬 *Notes:* ${payload.notes}`;
  }

  // Add route planning link if both locations have coordinates
  if (
    payload.pickupLat &&
    payload.pickupLng &&
    payload.destinationLat &&
    payload.destinationLng
  ) {
    body += `\n\n🗺️ *FULL ROUTE:*\n`;
    body += `https://www.google.com/maps/dir/?api=1&origin=${payload.pickupLat},${payload.pickupLng}&destination=${payload.destinationLat},${payload.destinationLng}&travelmode=driving`;
  }

  return sendWhatsApp(to, body);
}

export async function sendViewingRequest(
  to: string,
  payload: {
    listingTitle: string;
    listingId: string;
    customerName: string;
    customerContact: string;
    preferredSlot: string;
    notes?: string;
    listingLocation?: string;
  },
) {
  let body = `🏠 *New Property Viewing Request*\n\n`;
  body += `🏡 Property: ${payload.listingTitle}\n`;
  if (payload.listingLocation) {
    body += `📍 Location: ${payload.listingLocation}\n`;
  }
  body += `\n👤 *Prospect Details:*\n`;
  body += `Name: ${payload.customerName}\n`;
  body += `Contact: ${payload.customerContact}\n`;
  body += `\n🕐 *Preferred Time:* ${payload.preferredSlot}\n`;
  if (payload.notes) {
    body += `\n💬 *Additional Notes:*\n${payload.notes}`;
  }
  body += `\n\n📋 Listing ID: ${payload.listingId}`;
  return sendWhatsApp(to, body);
}

export async function sendBookingConfirmation(
  to: string,
  payload: {
    bookingId: string;
    itemTitle: string;
    customerName: string;
    checkIn?: string;
    checkOut?: string;
    totalPrice: number;
    currency: string;
    confirmationNumber: string;
  },
) {
  let body = `✅ *Booking Confirmed!*\n\n`;
  body += `🎫 Confirmation: ${payload.confirmationNumber}\n`;
  body += `📦 Booking ID: ${payload.bookingId}\n\n`;
  body += `🏠 ${payload.itemTitle}\n`;
  body += `👤 Guest: ${payload.customerName}\n`;
  if (payload.checkIn && payload.checkOut) {
    body += `📅 Check-in: ${payload.checkIn}\n`;
    body += `📅 Check-out: ${payload.checkOut}\n`;
  }
  body += `\n💰 Total: ${payload.currency} £${payload.totalPrice}\n`;
  body += `\nThank you for your booking!`;
  return sendWhatsApp(to, body);
}

export async function sendGeneralInquiry(
  to: string,
  payload: {
    subject: string;
    message: string;
    customerName?: string;
    customerContact?: string;
  },
) {
  let body = `📨 *New Inquiry*\n\n`;
  body += `📌 Subject: ${payload.subject}\n\n`;
  if (payload.customerName) {
    body += `👤 From: ${payload.customerName}\n`;
  }
  if (payload.customerContact) {
    body += `📱 Contact: ${payload.customerContact}\n\n`;
  }
  body += `💬 Message:\n${payload.message}`;
  return sendWhatsApp(to, body);
}

/**
 * Send a booking inquiry to a business via WhatsApp
 * Business can reply with YES [shortCode] [PRICE] or NO [shortCode]
 */
export async function sendBookingInquiry(
  to: string,
  payload: {
    shortCode: string; // e.g., 'A1B2' - last 4 chars of bookingId
    bookingId: string;
    listingTitle: string;
    listingCategory: string;
    customerName: string;
    customerPhone: string;
    date: string;
    time?: string;
    guests: number;
    duration?: string;
    customFields?: Record<string, string | number | boolean>;
    userMessage?: string;
  },
) {
  let body = `🔔 *New Booking Request*\n\n`;
  body += `📍 *${payload.listingTitle}*\n`;
  body += `📂 Category: ${payload.listingCategory}\n\n`;

  // Customer info
  body += `👤 *Customer:* ${payload.customerName}\n`;
  body += `📱 *Contact:* ${payload.customerPhone}\n\n`;

  // Booking details
  body += `📅 *Date:* ${payload.date}\n`;
  if (payload.time) {
    body += `🕐 *Time:* ${payload.time}\n`;
  }
  body += `👥 *Guests:* ${payload.guests}\n`;
  if (payload.duration) {
    body += `⏱️ *Duration:* ${payload.duration}\n`;
  }

  // Custom fields
  if (payload.customFields && Object.keys(payload.customFields).length > 0) {
    body += `\n📋 *Additional Details:*\n`;
    for (const [key, value] of Object.entries(payload.customFields)) {
      body += `• ${key}: ${value}\n`;
    }
  }

  // User message
  if (payload.userMessage) {
    body += `\n💬 *Customer Note:*\n${payload.userMessage}\n`;
  }

  // Response instructions
  body += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `*Reply with:*\n\n`;
  body += `✅ *YES ${payload.shortCode} [PRICE]* to confirm\n`;
  body += `   Example: YES ${payload.shortCode} 80\n\n`;
  body += `❌ *NO ${payload.shortCode}* to decline\n`;
  body += `━━━━━━━━━━━━━━━━━━━━━━`;

  return sendWhatsApp(to, body, {
    bookingId: payload.bookingId,
    role: "business",
  });
}
