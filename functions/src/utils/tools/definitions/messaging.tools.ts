import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const sendWhatsAppMessageTool: FunctionDeclaration = {
  name: "sendWhatsAppMessage",
  description: "Send a WhatsApp summary to the user or agent.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      recipient: { type: SchemaType.STRING },
      message: { type: SchemaType.STRING },
    },
    required: ["recipient", "message"],
  },
};

export const sendAppNotificationTool: FunctionDeclaration = {
  name: "sendAppNotification",
  description: "Send an in-app notification.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      userId: { type: SchemaType.STRING },
      message: { type: SchemaType.STRING },
    },
    required: ["userId", "message"],
  },
};

export const sendEmailNotificationTool: FunctionDeclaration = {
  name: "sendEmailNotification",
  description: "Send an email notification.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      email: { type: SchemaType.STRING },
      subject: { type: SchemaType.STRING },
      message: { type: SchemaType.STRING },
    },
    required: ["email", "subject", "message"],
  },
};
