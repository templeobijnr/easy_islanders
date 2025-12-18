import { logger } from "@/utils/logger";
import { describe, it, expect, vi } from "vitest";
import { GoogleImportService } from "./googleImportService";

// Mock dependencies
vi.mock("./firebaseConfig", () => ({
  storage: {},
}));

vi.mock("firebase/storage", () => ({
  ref: vi.fn().mockReturnValue({}), // Return a dummy object for the reference
  uploadBytes: vi.fn().mockResolvedValue({}), // Resolve successfully
  getDownloadURL: vi
    .fn()
    .mockResolvedValue(
      "https://firebasestorage.googleapis.com/v0/b/test/o/image.jpg",
    ),
}));

// Mock global fetch
global.fetch = vi.fn();

describe("GoogleImportService", () => {
  it("should map Google Place result to Activity", () => {
    const mockPlace = {
      place_id: "123",
      name: "Test Place",
      formatted_address: "123 Test St",
      geometry: { location: { lat: 10, lng: 20 } },
      international_phone_number: "+123456789",
      website: "https://test.com",
      rating: 4.5,
      user_ratings_total: 100,
    };

    const result = GoogleImportService.mapToActivity(mockPlace);

    expect(result.title).toBe("Test Place");
    expect(result.address).toBe("123 Test St");
    expect(result.coordinates).toEqual({ lat: 10, lng: 20 });
    expect(result.contact?.phone).toBe("+123456789");
    expect(result.contact?.website).toBe("https://test.com");
    expect(result.rating).toBe(4.5);
    expect(result.reviewCount).toBe(100);
  });

  it("should import images", async () => {
    // Mock fetch for proxy response
    (global.fetch as any).mockImplementation((url: string) => {
      logger.debug("Fetch called with:", url);
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(["fake-image"])),
      });
    });

    const photos = [{ photo_reference: "ref1" }, { photo_reference: "ref2" }];

    const urls = await GoogleImportService.importImages(photos, "place123");

    logger.debug("Imported URLs:", urls);

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("firebasestorage");
  });
});
