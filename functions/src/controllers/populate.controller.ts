import * as logger from "firebase-functions/logger";
import { Request, Response } from "express";
import { populateListingsChunked } from "../scripts/populateListings";
import { getErrorMessage } from '../utils/errors';

export const populateDatabase = async (req: Request, res: Response) => {
  try {
    logger.debug("🚀 Starting database population...");
    const count = await populateListingsChunked();
    res.json({
      success: true,
      message: `Successfully populated ${count} listings`,
      count,
    });
  } catch (error) {
    console.error("❌ Error populating database:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? getErrorMessage(error) : "Unknown error",
    });
  }
};
