import * as repo from '../repositories/taxi.repository';
import { TaxiRequest, TaxiDriver } from '../types/taxi';
import { sendWhatsApp } from './twilio.service';
import { db } from '../config/firebase';

/**
 * Broadcast request to available drivers
 */
export const broadcastRequest = async (request: TaxiRequest): Promise<void> => {
    // Find drivers in the same district
    const drivers = await repo.findAvailableTaxis(request.pickup.location.district);

    if (drivers.length === 0) {
        console.log(`No drivers available in district: ${request.pickup.location.district}`);
        // Fallback will be handled by timeout trigger
        return;
    }

    const requestCode = request.id.slice(-4).toUpperCase();
    const messageBody = `🚕 *NEW JOB* 🚕
From: ${request.pickup.address}
To: ${request.dropoff.address}
${request.priceEstimate ? `Est: ${request.priceEstimate} TL` : ''}

Reply *YES ${requestCode}* to accept.`;

    // Send WhatsApps to all available drivers
    const promises = drivers.map(driver =>
        sendWhatsApp(driver.phone, messageBody).catch(err => {
            console.error(`Failed to send WhatsApp to ${driver.name}:`, err);
            return null;
        })
    );

    await Promise.allSettled(promises);

    // Update record of who we messaged
    await repo.updateBroadcastList(request.id, drivers.map(d => d.id));

    console.log(`Broadcast sent to ${drivers.length} drivers for request ${request.id}`);
};

/**
 * Handle incoming WhatsApp reply from driver
 */
export const handleDriverReply = async (driverPhone: string, messageBody: string): Promise<string> => {
    // Clean phone number (remove whatsapp: prefix)
    const phone = driverPhone.replace('whatsapp:', '');
    console.log(`🚖 [handleDriverReply] Processing reply from: ${phone}`);
    console.log(`📝 [handleDriverReply] Message: ${messageBody}`);

    // Find the most recent pending request this driver was messaged about
    console.log(`🔍 [handleDriverReply] Looking for pending request for driver...`);
    const request = await repo.findPendingRequestForDriver(phone);

    if (!request) {
        console.log(`⚠️ [handleDriverReply] No active requests found for ${phone}`);
        return "No active requests found.";
    }

    console.log(`✅ [handleDriverReply] Found request: ${request.id}`);

    const messageTrimmed = messageBody.trim().toUpperCase();

    if (messageTrimmed.startsWith('YES')) {
        const driver = await repo.findDriverByPhone(phone);
        if (!driver) {
            return "Driver not found in system.";
        }

        const success = await repo.assignDriverToRequest(request.id, driver.id);

        if (success) {
            // Notify customer via WhatsApp
            await notifyCustomer(request, driver);

            // Send detailed pickup info to driver
            await sendDriverDetails(driver, request);

            // Send real-time update to customer's chat
            await sendChatUpdate(request, driver);

            return `✅ Job Accepted!
Customer: ${request.customerName}
Pickup: ${request.pickup.address}
Destination: ${request.dropoff.address}`;
        } else {
            return "❌ Job already taken by another driver.";
        }
    }

    if (messageTrimmed.startsWith('NO')) {
        return "👍 Understood. You'll receive the next available request.";
    }

    return "Please reply *YES* to accept or *NO* to decline.";
};

/**
 * Notify customer that driver is assigned
 */
async function notifyCustomer(request: TaxiRequest, driver: TaxiDriver): Promise<void> {
    const message = `🚕 *Taxi Confirmed!*

Driver: ${driver.name}
Vehicle: ${driver.vehicleType}
Rating: ${'⭐'.repeat(Math.round(driver.rating))}

Driver will contact you shortly.
Contact: ${driver.phone}`;

    try {
        await sendWhatsApp(request.customerPhone, message);
    } catch (error) {
        console.error('Failed to notify customer:', error);
    }
}

/**
 * Send real-time update to customer's chat session
 */
async function sendChatUpdate(request: TaxiRequest, driver: TaxiDriver): Promise<void> {
    try {
        const { db } = await import('../config/firebase');

        // Find the user's active chat session
        const sessionsSnap = await db.collection('chat_sessions')
            .where('userId', '==', request.userId)
            .where('status', '==', 'active')
            .orderBy('lastMessageAt', 'desc')
            .limit(1)
            .get();

        if (sessionsSnap.empty) {
            console.log('⚠️ [Chat Update] No active session found for user:', request.userId);
            return;
        }

        const sessionId = sessionsSnap.docs[0].id;

        // Create a system message in the chat
        const systemMessage = {
            role: 'model',
            parts: [{
                text: `🚕 *Taxi Update*\n\nGreat news! Your taxi has been confirmed!\n\n👤 **Driver:** ${driver.name}\n🚗 **Vehicle:** ${driver.vehicleType}\n⭐ **Rating:** ${driver.rating}/5\n📞 **Contact:** ${driver.phone}\n\nYour driver will contact you shortly and is on the way to pick you up.`
            }],
            timestamp: new Date(),
            metadata: {
                type: 'taxi_status_update',
                requestId: request.id,
                status: 'assigned',
                driverInfo: {
                    name: driver.name,
                    phone: driver.phone,
                    vehicleType: driver.vehicleType,
                    rating: driver.rating
                }
            }
        };

        // Add to chat history
        await db.collection('chat_sessions')
            .doc(sessionId)
            .collection('messages')
            .add(systemMessage);

        // Update session timestamp
        await db.collection('chat_sessions')
            .doc(sessionId)
            .update({
                lastMessageAt: new Date(),
                hasUnreadMessages: true
            });

        console.log(`✅ [Chat Update] Sent taxi status update to session: ${sessionId}`);

    } catch (error) {
        console.error('❌ [Chat Update] Failed to send chat update:', error);
    }
}

/**
 * Send detailed pickup information to driver
 */
async function sendDriverDetails(driver: TaxiDriver, request: TaxiRequest): Promise<void> {
    let message = `📍 *PICKUP DETAILS*

Customer: ${request.customerName}
Phone: ${request.customerPhone}

📍 Pickup: ${request.pickup.address}`;

    if (request.pickup.location.lat && request.pickup.location.lng) {
        message += `\n📲 Navigate: https://www.google.com/maps/dir/?api=1&destination=${request.pickup.location.lat},${request.pickup.location.lng}`;
    }

    message += `\n\n🎯 Destination: ${request.dropoff.address}`;

    try {
        await sendWhatsApp(driver.phone, message);
    } catch (error) {
        console.error('Failed to send driver details:', error);
    }
}

/**
 * Create and broadcast a new taxi request
 */
export const createAndBroadcastRequest = async (
    requestData: Omit<TaxiRequest, 'id' | 'status' | 'createdAt' | 'broadcastSentTo'>,
    sessionId?: string
): Promise<string> => {
    // Create the request
    const requestId = await repo.createTaxiRequest(requestData);

    // Get the full request object
    const request = await repo.getTaxiRequest(requestId);

    if (!request) {
        throw new Error('Failed to create taxi request');
    }

    // Store requestId in chat session for agent tracking
    if (sessionId) {
        try {
            await db.collection('chat_sessions').doc(sessionId).set({
                pendingTaxiRequestId: requestId,
                lastMessageAt: new Date()
            }, { merge: true });
            console.log(`✅ [Taxi Service] Stored requestId ${requestId} in session ${sessionId}`);
        } catch (error) {
            console.error(`⚠️ [Taxi Service] Failed to store requestId in session:`, error);
            // Don't fail the request creation if session update fails
        }
    }

    // Broadcast to drivers
    await broadcastRequest(request);

    return requestId;
};
