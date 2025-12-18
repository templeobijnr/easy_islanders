import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import * as taxiService from "../services/taxi.service";

/**
 * Webhook endpoint for Twilio WhatsApp replies
 * This should be configured in Twilio Console as the webhook URL
 */
export const webhookTwilio = async (req: Request, res: Response) => {
  try {
    const { From, Body } = req.body; // Twilio sends form-url-encoded data

    if (!From || !Body) {
      res.status(400).send("Missing required fields");
      return;
    }

    logger.debug(`Received WhatsApp from ${From}: ${Body}`);

    const replyText = await taxiService.handleDriverReply(From, Body);

    // Return TwiML XML response
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
  } catch (error) {
    console.error("Error in Twilio webhook:", error);
    res.status(500).send("Internal server error");
  }
};

/**
 * API endpoint to request a taxi
 * Called by the frontend or AI agent
 */
export const requestTaxi = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      customerName,
      customerPhone,
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupDistrict,
      dropoffAddress,
      priceEstimate,
    } = req.body;

    // Validation
    if (
      !userId ||
      !customerName ||
      !customerPhone ||
      !pickupAddress ||
      !dropoffAddress ||
      !pickupDistrict
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const requestId = await taxiService.createAndBroadcastRequest({
      userId,
      customerName,
      customerPhone,
      pickup: {
        address: pickupAddress,
        location: {
          lat: pickupLat || 0,
          lng: pickupLng || 0,
          district: pickupDistrict,
        },
      },
      dropoff: {
        address: dropoffAddress,
      },
      priceEstimate,
    });

    res.json({
      success: true,
      requestId,
      message: "Taxi request sent to available drivers",
    });
  } catch (error) {
    console.error("Error requesting taxi:", error);
    res.status(500).json({ error: "Failed to request taxi" });
  }
};
