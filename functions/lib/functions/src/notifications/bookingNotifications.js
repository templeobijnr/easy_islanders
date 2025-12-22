"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBookingUpdated = exports.onBookingRequested = void 0;
const functions = __importStar(require("firebase-functions"));
const communication_tools_1 = require("../services/tools/communication.tools");
const twilio_service_1 = require("../services/twilio.service");
const firebase_1 = require("../config/firebase");
exports.onBookingRequested = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const booking = snap.data();
    if (!booking || booking.status !== 'requested')
        return;
    try {
        const stayId = booking.stayId;
        if (!stayId)
            return;
        const staySnap = await firebase_1.db.doc(`stays/${stayId}`).get();
        if (!staySnap.exists)
            return;
        const stay = staySnap.data();
        const hostPhone = stay.hostPhone || process.env.EASY_HOST_PHONE || null;
        if (!hostPhone) {
            console.warn('Host phone missing; skipping WhatsApp notification');
            return;
        }
        const fromDate = (_c = (_b = (_a = booking.startDate) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : (booking.startDate ? new Date(booking.startDate) : null);
        const toDate = (_f = (_e = (_d = booking.endDate) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : (booking.endDate ? new Date(booking.endDate) : null);
        const bookingId = context.params.bookingId;
        const lines = [
            `🏡 New request to book "${stay.title || 'your stay'}"`,
            fromDate && toDate
                ? `📅 Dates: ${fromDate.toDateString()} - ${toDate.toDateString()}`
                : undefined,
            booking.guests
                ? `👥 Guests: ${booking.guests}`
                : undefined,
            booking.guestDetails
                ? `🙋 Guest: ${booking.guestDetails.firstName || ''} ${booking.guestDetails.lastName || ''} (${booking.guestDetails.phone || booking.guestDetails.email || ''})`
                : undefined,
            ((_g = booking.guestDetails) === null || _g === void 0 ? void 0 : _g.message)
                ? `💬 Message: ${booking.guestDetails.message}`
                : undefined,
            '',
            `Ref: ${bookingId}`,
            `Reply *YES ${bookingId}* to confirm or *NO ${bookingId}* to decline.`,
        ].filter(Boolean);
        const body = lines.join('\n');
        // Send WhatsApp to host phone
        await (0, twilio_service_1.sendWhatsApp)(hostPhone, body, {
            bookingId,
            stayId,
            role: 'host',
        });
        // Optionally email the host as well (using stay.hostEmail or fallback)
        const hostEmail = stay.hostEmail || process.env.EASY_HOST_EMAIL;
        if (hostEmail) {
            await communication_tools_1.communicationTools.sendEmailNotification({
                to: hostEmail,
                subject: `New request to book "${stay.title || 'your stay'}"`,
                body,
            });
        }
        await snap.ref.update({ hostNotified: true }).catch(() => { });
    }
    catch (err) {
        console.error('Error handling booking request notification', err);
    }
});
/**
 * Booking update trigger – notifies guests when hosts respond
 * or when admins change the booking status.
 *
 * Channels:
 *  - WhatsApp (guest phone, if provided)
 *  - Email   (guest email, if provided – requires real email provider)
 *  - In‑app notification (notifications collection)
 *  - Chat session system message (if an active chat exists)
 */
exports.onBookingUpdated = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e;
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    const bookingId = context.params.bookingId;
    const userId = after.userId;
    // Helper: safely parse dates
    const parseDate = (value) => {
        if (!value)
            return null;
        if (value.toDate && typeof value.toDate === 'function') {
            return value.toDate();
        }
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    };
    const fromDate = parseDate(after.startDate);
    const toDate = parseDate(after.endDate);
    const stayTitle = after.stayTitle || ((_a = after.stay) === null || _a === void 0 ? void 0 : _a.title) || 'your stay';
    const guestName = ((_b = after.guestDetails) === null || _b === void 0 ? void 0 : _b.firstName) ||
        ((_c = after.guestDetails) === null || _c === void 0 ? void 0 : _c.name) ||
        'Guest';
    const guestPhone = ((_d = after.guestDetails) === null || _d === void 0 ? void 0 : _d.phone) || after.guestPhone || undefined;
    const guestEmail = ((_e = after.guestDetails) === null || _e === void 0 ? void 0 : _e.email) || after.guestEmail || undefined;
    /**
     * 1) Host reply notifications (YES/NO bookingId)
     */
    const hostReplyBefore = before.hostReplyStatus;
    const hostReplyAfter = after.hostReplyStatus;
    if (!hostReplyBefore && hostReplyAfter && !after.guestNotifiedHostReplyAt) {
        const isAccepted = hostReplyAfter === 'accepted';
        const summaryLines = [
            isAccepted
                ? `✅ Your host has *accepted* your request to book "${stayTitle}".`
                : `❌ Your host has *declined* your request to book "${stayTitle}".`,
            fromDate && toDate
                ? `📅 Dates: ${fromDate.toDateString()} - ${toDate.toDateString()}`
                : undefined,
            after.guests ? `👥 Guests: ${after.guests}` : undefined,
            '',
            `Booking reference: ${bookingId}`,
        ].filter(Boolean);
        const summary = summaryLines.join('\n');
        // In‑app notification
        if (userId) {
            await communication_tools_1.communicationTools.sendAppNotification({
                userId,
                title: isAccepted
                    ? 'Host accepted your booking request'
                    : 'Host declined your booking request',
                message: summary,
                type: isAccepted ? 'booking_confirmed' : 'booking_cancelled',
            }).catch(err => {
                console.error('Failed to send app notification for host reply', err);
            });
        }
        // WhatsApp to guest (if number available)
        if (guestPhone) {
            try {
                await (0, twilio_service_1.sendWhatsApp)(guestPhone, summary, {
                    bookingId,
                    stayId: after.stayId,
                    role: 'guest',
                });
            }
            catch (err) {
                console.error('Failed to send WhatsApp to guest for host reply', err);
            }
        }
        // Email to guest (if email + provider configured)
        if (guestEmail) {
            await communication_tools_1.communicationTools.sendEmailNotification({
                to: guestEmail,
                subject: isAccepted
                    ? `Host accepted your booking request for "${stayTitle}"`
                    : `Host declined your booking request for "${stayTitle}"`,
                body: summary,
            }).catch(err => {
                console.error('Failed to send email to guest for host reply', err);
            });
        }
        // Optional: push a system message into the latest chat session
        if (userId) {
            try {
                const sessionsSnap = await firebase_1.db
                    .collection('chatSessions')
                    .where('userId', '==', userId)
                    .where('status', '==', 'active')
                    .orderBy('lastMessageAt', 'desc')
                    .limit(1)
                    .get();
                if (!sessionsSnap.empty) {
                    const sessionId = sessionsSnap.docs[0].id;
                    const systemMessage = {
                        role: 'model',
                        parts: [
                            {
                                text: summary,
                            },
                        ],
                        timestamp: new Date().toISOString(),
                        metadata: {
                            type: 'booking_host_reply',
                            bookingId,
                            stayId: after.stayId || null,
                            hostReplyStatus: hostReplyAfter,
                        },
                    };
                    await firebase_1.db
                        .collection('chatSessions')
                        .doc(sessionId)
                        .collection('messages')
                        .add(systemMessage);
                    await firebase_1.db
                        .collection('chatSessions')
                        .doc(sessionId)
                        .set({
                        lastMessageAt: new Date().toISOString(),
                        hasUnreadMessages: true,
                    }, { merge: true });
                }
            }
            catch (err) {
                console.error('Failed to push booking host reply into chat', err);
            }
        }
        await change.after.ref
            .set({
            guestNotifiedHostReplyAt: new Date().toISOString(),
        }, { merge: true })
            .catch(err => {
            console.error('Failed to mark guestNotifiedHostReplyAt', err);
        });
        // We deliberately do not return here so status notifications can also run
        // when admins later confirm/cancel the booking.
    }
    /**
     * 2) Status change notifications (confirmed/cancelled)
     *    Triggered when admin updates the booking status.
     */
    const statusBefore = before.status;
    const statusAfter = after.status;
    if (statusBefore !== statusAfter &&
        (statusAfter === 'confirmed' || statusAfter === 'cancelled') &&
        !after.guestNotifiedStatusAt) {
        const isConfirmed = statusAfter === 'confirmed';
        const title = isConfirmed
            ? 'Your booking has been confirmed'
            : 'Your booking has been cancelled';
        const bodyLines = [
            isConfirmed
                ? `✅ Your booking for "${stayTitle}" is now *confirmed*.`
                : `❌ Your booking for "${stayTitle}" has been *cancelled*.`,
            fromDate && toDate
                ? `📅 Dates: ${fromDate.toDateString()} - ${toDate.toDateString()}`
                : undefined,
            after.guests ? `👥 Guests: ${after.guests}` : undefined,
            '',
            `Booking reference: ${bookingId}`,
        ].filter(Boolean);
        const body = bodyLines.join('\n');
        // In‑app notification
        if (userId) {
            await communication_tools_1.communicationTools.sendAppNotification({
                userId,
                title,
                message: body,
                type: isConfirmed ? 'booking_confirmed' : 'booking_cancelled',
            }).catch(err => {
                console.error('Failed to send app notification for status change', err);
            });
        }
        // WhatsApp – use dedicated confirmation helper when confirmed
        if (guestPhone) {
            try {
                if (isConfirmed) {
                    await (0, twilio_service_1.sendBookingConfirmation)(guestPhone, {
                        bookingId,
                        itemTitle: stayTitle,
                        customerName: guestName,
                        checkIn: fromDate ? fromDate.toDateString() : undefined,
                        checkOut: toDate ? toDate.toDateString() : undefined,
                        totalPrice: after.totalPrice || 0,
                        currency: after.currency || 'GBP',
                        confirmationNumber: bookingId,
                    });
                }
                else {
                    await (0, twilio_service_1.sendWhatsApp)(guestPhone, body, {
                        bookingId,
                        stayId: after.stayId,
                        role: 'guest',
                    });
                }
            }
            catch (err) {
                console.error('Failed to send WhatsApp to guest for status change', err);
            }
        }
        // Email to guest (if email + provider configured)
        if (guestEmail) {
            await communication_tools_1.communicationTools.sendEmailNotification({
                to: guestEmail,
                subject: title,
                body,
            }).catch(err => {
                console.error('Failed to send email to guest for status change', err);
            });
        }
        // Optional: system message in chat
        if (userId) {
            try {
                const sessionsSnap = await firebase_1.db
                    .collection('chatSessions')
                    .where('userId', '==', userId)
                    .where('status', '==', 'active')
                    .orderBy('lastMessageAt', 'desc')
                    .limit(1)
                    .get();
                if (!sessionsSnap.empty) {
                    const sessionId = sessionsSnap.docs[0].id;
                    const systemMessage = {
                        role: 'model',
                        parts: [
                            {
                                text: body,
                            },
                        ],
                        timestamp: new Date().toISOString(),
                        metadata: {
                            type: 'booking_status_update',
                            bookingId,
                            stayId: after.stayId || null,
                            status: statusAfter,
                        },
                    };
                    await firebase_1.db
                        .collection('chatSessions')
                        .doc(sessionId)
                        .collection('messages')
                        .add(systemMessage);
                    await firebase_1.db
                        .collection('chatSessions')
                        .doc(sessionId)
                        .set({
                        lastMessageAt: new Date().toISOString(),
                        hasUnreadMessages: true,
                    }, { merge: true });
                }
            }
            catch (err) {
                console.error('Failed to push booking status update into chat', err);
            }
        }
        await change.after.ref
            .set({
            guestNotifiedStatusAt: new Date().toISOString(),
        }, { merge: true })
            .catch(err => {
            console.error('Failed to mark guestNotifiedStatusAt', err);
        });
    }
});
//# sourceMappingURL=bookingNotifications.js.map