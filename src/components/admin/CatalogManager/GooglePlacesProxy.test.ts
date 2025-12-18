import { logger } from "@/utils/logger";
import { describe, it, expect } from "vitest";

// Use the production URL as configured in .env
const API_URL =
  "https://europe-west1-easy-islanders.cloudfunctions.net/googlePlacesProxy";

const RUN_INTEGRATION = process.env.RUN_INTEGRATION === "true";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("Google Places Proxy Integration", () => {
  it('should return autocomplete suggestions for "Kyrenia"', async () => {
    const query = "Kyrenia";
    const url = `${API_URL}?action=autocomplete&input=${encodeURIComponent(query)}&lat=35.33&lng=33.32&radius=50000`;

    const res = await fetch(url);
    const data = await res.json();
    logger.debug("Autocomplete Response:", JSON.stringify(data, null, 2));

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("predictions");
    expect(Array.isArray(data.predictions)).toBe(true);
    expect(data.predictions.length).toBeGreaterThan(0);

    // Check if at least one result contains "Kyrenia" or "Girne"
    const hasKyrenia = data.predictions.some(
      (p: any) =>
        p.description.includes("Kyrenia") || p.description.includes("Girne"),
    );
    expect(hasKyrenia).toBe(true);
  });

  it("should reverse geocode coordinates to an address", async () => {
    // Coordinates for Kyrenia Harbour (approx)
    const lat = 35.3417;
    const lng = 33.3198;
    const url = `${API_URL}?action=geocode&lat=${lat}&lng=${lng}`;

    const res = await fetch(url);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);

    // Check if the address contains "Kyrenia" or "Girne"
    const address = data.results[0].formatted_address;
    expect(address).toBeTruthy();
    const isKyrenia = address.includes("Kyrenia") || address.includes("Girne");
    expect(isKyrenia).toBe(true);
  });
});
