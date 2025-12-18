/**
 * Communication Tools
 *
 * Handles WhatsApp messages, notifications, and user communications.
 */

import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";
import type { SendWhatsAppArgs } from "../../types/tools";
import { db } from "../../config/firebase";

const now = FieldValue.serverTimestamp;

interface ToolResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export const communicationTools = {
  /**
   * Send a WhatsApp message via Twilio
   */
  sendWhatsAppMessage: async (args: SendWhatsAppArgs): Promise<ToolResult> => {
    logger.debug("📱 [WhatsApp] Sending message:", args);

    try {
      const { sendWhatsApp } = await import("../twilio.service");
      const res = await sendWhatsApp(args.recipient, args.message);

      // Log notification to database
      await db.collection("notifications").add({
        userId: args.userId || null,
        channel: "whatsapp",
        message: args.message,
        to: args.recipient,
        status: res.status || "sent",
        createdAt: now(),
      });

      return {
        success: true,
        status: res.status,
        sid: res.sid,
      };
    } catch (err: any) {
      console.error("🔴 [WhatsApp] Failed:", err);
      return {
        success: false,
        error: err.message || "send failed",
      };
    }
  },

  /**
   * Send an in-app notification
   */
  sendAppNotification: async (args: {
    userId: string;
    title?: string;
    message: string;
    type?: string;
  }): Promise<ToolResult> => {
    logger.debug("🔔 [Notification] Sending app notification:", args);

    try {
      await db.collection("notifications").add({
        userId: args.userId,
        channel: "app",
        title: args.title || "Notification",
        message: args.message,
        type: args.type || "info",
        read: false,
        createdAt: now(),
      });

      return {
        success: true,
        message: "Notification sent",
      };
    } catch (err: any) {
      console.error("🔴 [Notification] Failed:", err);
      return {
        success: false,
        error: err.message || "Failed to send notification",
      };
    }
  },

  /**
   * Send an email notification
   * @future Implement email service integration
   */
  sendEmailNotification: async (args: {
    to?: string;
    email?: string;
    subject: string;
    body?: string;
    message?: string;
  }): Promise<ToolResult> => {
    const to = args.to || args.email;
    const body = args.body || args.message;
    logger.debug("📧 [Email] Sending email notification:", {
      to,
      subject: args.subject,
      preview: (body || "").slice(0, 80),
    });

    // TODO: Implement actual email service (SendGrid, etc.)
    console.warn("⚠️ Email service not yet implemented");

    return {
      success: false,
      error: "Email service not implemented yet",
    };
  },
};
