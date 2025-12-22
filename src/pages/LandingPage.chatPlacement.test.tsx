import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./LandingPage";

vi.mock("./home/ValueProps", () => ({
  default: () => <div data-testid="value-props">What your island assistant can do</div>,
}));

vi.mock("./home/FeaturedDestinations", () => ({
  default: () => <div data-testid="featured-destinations">Explore your region</div>,
}));

vi.mock("./home/Hero", () => ({
  default: () => <div>Hero</div>,
}));

vi.mock("./home/LifestyleHighlights", () => ({
  default: () => <div>Lifestyle</div>,
}));

vi.mock("./home/FeaturedStays", () => ({
  default: () => <div>Stays</div>,
}));

vi.mock("./home/TrendingConnect", () => ({
  default: () => <div>Trending</div>,
}));

vi.mock("@/features/chat/components/AgentChatPanel", () => ({
  default: () => <div data-testid="agent-chat-panel">Chat Inline</div>,
}));

describe("LandingPage chat placement", () => {
  it("renders embedded chat between ValueProps and FeaturedDestinations", () => {
    render(<LandingPage onStartChat={() => {}} />);

    const value = screen.getByTestId("value-props");
    const chat = screen.getByTestId("agent-chat-panel");
    const explore = screen.getByTestId("featured-destinations");

    const order = Array.from(value.parentElement!.children);
    expect(order.indexOf(value)).toBeLessThan(order.indexOf(chat));
    expect(order.indexOf(chat)).toBeLessThan(order.indexOf(explore));
  });
});


