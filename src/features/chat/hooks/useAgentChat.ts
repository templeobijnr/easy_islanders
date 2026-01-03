export type AgentChatVariant = "embedded" | "page";

export function useAgentChat(variant: AgentChatVariant) {
  return { variant } as const;
}




