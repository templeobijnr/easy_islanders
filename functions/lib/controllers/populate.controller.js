"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateDatabase = void 0;
const populateListings_1 = require("../scripts/populateListings");
const populateDatabase = async (req, res) => {
    try {
        console.log('🚀 Starting database population...');
        const count = await (0, populateListings_1.populateListingsChunked)();
        res.json({
            success: true,
            message: `Successfully populated ${count} listings`,
            count
        });
    }
    catch (error) {
        console.error('❌ Error populating database:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.populateDatabase = populateDatabase;
//# sourceMappingURL=populate.controller.js.map