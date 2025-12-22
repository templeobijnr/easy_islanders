import * as functions from 'firebase-functions';
import { communicationTools } from '../services/tools/communication.tools';
import { sendWhatsApp, sendBookingConfirmation } from '../services/twilio.service';
import { db } from '../config/firebase';

export const onBookingRequested = functions.firestore
  .document('bookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data() as any;
    if (!booking || booking.status !== 'requested') return;

    try {
      const stayId = booking.stayId;
      if (!stayId) return;

      const staySnap = await db.doc(`stays/${stayId}`).get();
      if (!staySnap.exists) return;

      const stay = staySnap.data() as any;

      const hostPhone =
        stay.hostPhone || process.env.EASY_HOST_PHONE || null;

      if (!hostPhone) {
        console.warn(
          'Host phone missing; skipping WhatsApp notification'
        );
        return;
      }

      const fromDate =
        booking.startDate?.toDate?.() ??
        (booking.startDate ? new Date(booking.startDate) : null);
      const toDate =
        booking.endDate?.toDate?.() ??
        (booking.endDate ? new Date(booking.endDate) : null);

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
          ? `🙋 Guest: ${booking.guestDetails.firstName || ''} ${
              booking.guestDetails.lastName || ''
            } (${booking.guestDetails.phone || booking.guestDetails.email || ''})`
          : undefined,
        booking.guestDetails?.message
          ? `💬 Message: ${booking.guestDetails.message}`
          : undefined,
        '',
        `Ref: ${bookingId}`,
        `Reply *YES ${bookingId}* to confirm or *NO ${bookingId}* to decline.`,
      ].filter(Boolean) as string[];

      const body = lines.join('\n');

      // Send WhatsApp to host phone
      await sendWhatsApp(hostPhone, body, {
        bookingId,
        stayId,
        role: 'host',
      });

      // Optionally email the host as well (using stay.hostEmail or fallback)
      const hostEmail = stay.hostEmail || process.env.EASY_HOST_EMAIL;
      if (hostEmail) {
        await communicationTools.sendEmailNotification({
          to: hostEmail,
          subject: `New request to book "${stay.title || 'your stay'}"`,
          body,
        });
      }

      await snap.ref.update({ hostNotified: true }).catch(() => {});
    } catch (err) {
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
export const onBookingUpdated = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as any;
    const after = change.after.data() as any;
    if (!after) return;

    const bookingId = context.params.bookingId;
    const userId = after.userId as string | undefined;

    // Helper: safely parse dates
    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate();
      }
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const fromDate = parseDate(after.startDate);
    const toDate = parseDate(after.endDate);

    const stayTitle = after.stayTitle || after.stay?.title || 'your stay';
    const guestName =
      after.guestDetails?.firstName ||
      after.guestDetails?.name ||
      'Guest';

    const guestPhone: string | undefined =
      after.guestDetails?.phone || after.guestPhone || undefined;
    const guestEmail: string | undefined =
      after.guestDetails?.email || after.guestEmail || undefined;

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
      ].filter(Boolean) as string[];

      const summary = summaryLines.join('\n');

      // In‑app notification
      if (userId) {
        await communicationTools.sendAppNotification({
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
          await sendWhatsApp(guestPhone, summary, {
            bookingId,
            stayId: after.stayId,
            role: 'guest',
          });
        } catch (err) {
          console.error('Failed to send WhatsApp to guest for host reply', err);
        }
      }

      // Email to guest (if email + provider configured)
      if (guestEmail) {
        await communicationTools.sendEmailNotification({
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
          const sessionsSnap = await db
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

            await db
              .collection('chatSessions')
              .doc(sessionId)
              .collection('messages')
              .add(systemMessage);

            await db
              .collection('chatSessions')
              .doc(sessionId)
              .set(
                {
                  lastMessageAt: new Date().toISOString(),
                  hasUnreadMessages: true,
                },
                { merge: true }
              );
          }
        } catch (err) {
          console.error('Failed to push booking host reply into chat', err);
        }
      }

      await change.after.ref
        .set(
          {
            guestNotifiedHostReplyAt: new Date().toISOString(),
          },
          { merge: true }
        )
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

    if (
      statusBefore !== statusAfter &&
      (statusAfter === 'confirmed' || statusAfter === 'cancelled') &&
      !after.guestNotifiedStatusAt
    ) {
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
      ].filter(Boolean) as string[];

      const body = bodyLines.join('\n');

      // In‑app notification
      if (userId) {
        await communicationTools.sendAppNotification({
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
            await sendBookingConfirmation(guestPhone, {
              bookingId,
              itemTitle: stayTitle,
              customerName: guestName,
              checkIn: fromDate ? fromDate.toDateString() : undefined,
              checkOut: toDate ? toDate.toDateString() : undefined,
              totalPrice: after.totalPrice || 0,
              currency: after.currency || 'GBP',
              confirmationNumber: bookingId,
            });
          } else {
            await sendWhatsApp(guestPhone, body, {
              bookingId,
              stayId: after.stayId,
              role: 'guest',
            });
          }
        } catch (err) {
          console.error('Failed to send WhatsApp to guest for status change', err);
        }
      }

      // Email to guest (if email + provider configured)
      if (guestEmail) {
        await communicationTools.sendEmailNotification({
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
          const sessionsSnap = await db
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

            await db
              .collection('chatSessions')
              .doc(sessionId)
              .collection('messages')
              .add(systemMessage);

            await db
              .collection('chatSessions')
              .doc(sessionId)
              .set(
                {
                  lastMessageAt: new Date().toISOString(),
                  hasUnreadMessages: true,
                },
                { merge: true }
              );
          }
        } catch (err) {
          console.error('Failed to push booking status update into chat', err);
        }
      }

      await change.after.ref
        .set(
          {
            guestNotifiedStatusAt: new Date().toISOString(),
          },
          { merge: true }
        )
        .catch(err => {
          console.error('Failed to mark guestNotifiedStatusAt', err);
        });
    }
  });
