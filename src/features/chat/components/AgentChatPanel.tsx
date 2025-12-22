import React from "react";
import AgentChat from "@/pages/chat/AgentChat";
import { useAgentChat, type AgentChatVariant } from "../hooks/useAgentChat";

type Props = {
  variant: AgentChatVariant;
};

export default function AgentChatPanel({ variant }: Props) {
  const vm = useAgentChat(variant);

  if (vm.variant === "embedded") {
    return (
      <section
        id="agent"
        data-testid="agent-chat-embedded"
        className="bg-slate-50"
      >
        <div className="container mx-auto px-6 pt-16 pb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Chat with your island assistant
          </h2>
          <p className="text-slate-500 max-w-2xl">
            Ask anything—rentals, services, events, transport—and get instant help.
          </p>
        </div>

        <AgentChat variant="embedded" />
      </section>
    );
  }

  return (
    <section data-testid="agent-chat-page" className="bg-slate-50">
      <AgentChat variant="page" />
    </section>
  );
}


