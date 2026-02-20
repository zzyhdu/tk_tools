import { describe, expect, it } from "vitest";
import {
  calculatePackingResults,
  getFactorGroups,
  getNormalizedPreviewDimensions,
} from "./packing";

describe("getFactorGroups", () => {
  it("returns ordered factor triplets whose product equals n", () => {
    const groups = getFactorGroups(12);

    expect(groups).toContainEqual([2, 2, 3]);
    expect(groups).toContainEqual([3, 2, 2]);
    expect(groups.every(([a, b, c]) => a * b * c === 12)).toBe(true);
  });
});

describe("calculatePackingResults", () => {
  it("returns unique solutions sorted by squareness score", () => {
    const results = calculatePackingResults(
      { length: 10, width: 10, height: 10 },
      12,
    );

    expect(results).toHaveLength(4);
    expect(results[0].dims).toEqual({ l: 20, w: 20, h: 30 });
    expect(results[0].ratio).toBe("1.50");
  });

  it("returns an empty list when input is incomplete", () => {
    const results = calculatePackingResults(
      { length: 0, width: 10, height: 10 },
      12,
    );

    expect(results).toEqual([]);
  });

  it("limits returned solutions when maxResults is provided", () => {
    const allResults = calculatePackingResults(
      { length: 10, width: 10, height: 10 },
      36,
    );
    const limitedResults = calculatePackingResults(
      { length: 10, width: 10, height: 10 },
      36,
      3,
    );

    expect(allResults.length).toBeGreaterThan(3);
    expect(limitedResults).toHaveLength(3);
    expect(limitedResults).toEqual(allResults.slice(0, 3));
  });
});

describe("getNormalizedPreviewDimensions", () => {
  it("keeps relative proportions when normalizing", () => {
    const normalized = getNormalizedPreviewDimensions(
      { l: 40, w: 20, h: 10 },
      40,
      0,
    );

    expect(normalized).toEqual({ length: 40, width: 20, height: 10 });
  });

  it("falls back to minimum size when dimensions are invalid", () => {
    const normalized = getNormalizedPreviewDimensions(
      { l: 0, w: 0, h: 0 },
      40,
      8,
    );

    expect(normalized).toEqual({ length: 8, width: 8, height: 8 });
  });
});
