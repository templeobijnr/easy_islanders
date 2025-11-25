import { Request, Response } from 'express';
import { populateListingsChunked } from '../scripts/populateListings';

export const populateDatabase = async (req: Request, res: Response) => {
    try {
        console.log('🚀 Starting database population...');
        const count = await populateListingsChunked();
        res.json({
            success: true,
            message: `Successfully populated ${count} listings`,
            count
        });
    } catch (error) {
        console.error('❌ Error populating database:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
