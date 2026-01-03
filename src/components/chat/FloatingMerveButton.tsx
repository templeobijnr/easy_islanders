/**
 * FloatingMerveButton
 *
 * Restored after App refactor: `AppContent` expects a floating entrypoint button at
 * `src/components/chat/FloatingMerveButton`.
 */
import React from "react";
import { Sparkles } from "lucide-react";

export type FloatingMerveButtonProps = {
  onClick: () => void;
};

export function FloatingMerveButton({ onClick }: FloatingMerveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-slate-900/20 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
      aria-label="Open chat with Merve"
    >
      <Sparkles size={18} className="text-teal-200" />
      <span>Merve</span>
      <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-200">
        Live
      </span>
    </button>
  );
}

export default FloatingMerveButton;




