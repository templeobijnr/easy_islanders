/**
 * ChatBubble
 *
 * Restored after App refactor: `AppContent` expects a chat overlay component at
 * `src/components/chat/ChatBubble`.
 *
 * IMPORTANT:
 * - Keep this as a thin UI shell so it doesn't create cross-domain dependency cycles.
 * - Render the canonical chat experience from `pages/chat/AgentChat`.
 */
import React from "react";
import { X } from "lucide-react";
import AgentChat from "@/pages/chat/AgentChat";

export type ChatBubbleProps = {
  onClose: () => void;
};

export function ChatBubble({ onClose }: ChatBubbleProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative h-full w-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full bg-white/90 p-2 text-slate-700 shadow-lg hover:bg-white"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>

        {/* Canonical chat UI */}
        <div className="relative h-full w-full overflow-auto">
          <AgentChat />
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;


