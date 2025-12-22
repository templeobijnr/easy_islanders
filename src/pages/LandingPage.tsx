/**
 * LandingPage
 *
 * Thin route component for `/` used by `AppRoutes`.
 * Composes existing home sections; no routing or business logic here.
 */
import React from "react";
import Hero from "./home/Hero";
import ValueProps from "./home/ValueProps";
import FeaturedDestinations from "./home/FeaturedDestinations";
import LifestyleHighlights from "./home/LifestyleHighlights";
import FeaturedStays from "./home/FeaturedStays";
import TrendingConnect from "./home/TrendingConnect";
import AgentChatPanel from "@/features/chat/components/AgentChatPanel";

export type LandingPageProps = {
  onStartChat: () => void;
};

export default function LandingPage({ onStartChat }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <Hero onStartChat={onStartChat} />
      <ValueProps />

      {/* Inline chat section (embedded) */}
      <AgentChatPanel variant="embedded" />

      <FeaturedDestinations />
      <LifestyleHighlights />
      <FeaturedStays />
      <TrendingConnect />
    </main>
  );
}


