"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsumerRequestTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.createConsumerRequestTool = {
    name: "createConsumerRequest",
    description: "Create a general request for items not found in the marketplace.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            requestDetails: { type: generative_ai_1.SchemaType.STRING },
            contactInfo: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["requestDetails", "contactInfo"],
    },
};
//# sourceMappingURL=consumerRequest.tools.js.map