import { describe, expect, it } from "vitest";
import {
  calculatePackingResults,
  expandLayoutLayers,
  getNormalizedLayerGridPreview,
  getFactorGroups,
  getNormalizedPreviewDimensions,
  parseLayoutSegments,
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

  it("includes mixed-layer layouts when top and bottom use different orientations", () => {
    const results = calculatePackingResults(
      { length: 12, width: 8, height: 8 },
      10,
      20,
    );

    const normalizedDims = results.map((result) =>
      [result.dims.l, result.dims.w, result.dims.h].sort((a, b) => a - b).join(","),
    );

    expect(normalizedDims).toContain("16,20,24");
  });
});

describe("parseLayoutSegments", () => {
  it("parses a single layout segment", () => {
    const segments = parseLayoutSegments("2 × 3 × 1");

    expect(segments).toEqual([
      {
        nx: 2,
        ny: 3,
        nz: 1,
      },
    ]);
  });

  it("parses mixed-layer layout segments", () => {
    const segments = parseLayoutSegments("2 × 2 × 1 + 2 × 3 × 1");

    expect(segments).toEqual([
      {
        nx: 2,
        ny: 2,
        nz: 1,
      },
      {
        nx: 2,
        ny: 3,
        nz: 1,
      },
    ]);
  });
});

describe("expandLayoutLayers", () => {
  it("expands a single segment by nz into per-layer layout", () => {
    const layers = expandLayoutLayers("2 × 2 × 3");

    expect(layers).toEqual([
      { nx: 2, ny: 2, nz: 1 },
      { nx: 2, ny: 2, nz: 1 },
      { nx: 2, ny: 2, nz: 1 },
    ]);
  });

  it("expands mixed segments into stacked layers in order", () => {
    const layers = expandLayoutLayers("2 × 2 × 1 + 2 × 3 × 2");

    expect(layers).toEqual([
      { nx: 2, ny: 2, nz: 1 },
      { nx: 2, ny: 3, nz: 1 },
      { nx: 2, ny: 3, nz: 1 },
    ]);
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

  it("keeps thin sides proportional instead of inflating them to min size", () => {
    const normalized = getNormalizedPreviewDimensions(
      { l: 120, w: 8, h: 8 },
      68,
      16,
    );

    expect(normalized).toEqual({ length: 68, width: 5, height: 5 });
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

describe("getNormalizedLayerGridPreview", () => {
  it("keeps nx/ny ratio for per-layer grid previews", () => {
    const normalized = getNormalizedLayerGridPreview(2, 3, 48);
    expect(normalized).toEqual({ width: 32, height: 48 });
  });
});
