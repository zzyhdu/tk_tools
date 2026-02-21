import { describe, expect, it } from "vitest";
import type { PackingDims, PackingResult } from "./packing";
import {
  buildPricingPhysicalInputs,
  pickSelectedPackingDims,
  toCmDimensions,
  type SupportedUnit,
} from "./skuWorkflow";

const fallbackDims: PackingDims = {
  length: 20,
  width: 10,
  height: 5,
};

const packingResults: PackingResult[] = [
  {
    layout: "2 × 2 × 1",
    dims: { l: 40, w: 20, h: 5 },
    ratio: "8.00",
    score: 1,
    volume: 4000,
  },
  {
    layout: "1 × 2 × 2",
    dims: { l: 20, w: 20, h: 10 },
    ratio: "2.00",
    score: 2,
    volume: 4000,
  },
];

describe("pickSelectedPackingDims", () => {
  it("returns selected result dimensions when index is valid", () => {
    const picked = pickSelectedPackingDims(packingResults, 1, fallbackDims);
    expect(picked).toEqual({ l: 20, w: 20, h: 10 });
  });

  it("falls back to top result when selected index is out of range", () => {
    const picked = pickSelectedPackingDims(packingResults, 99, fallbackDims);
    expect(picked).toEqual({ l: 40, w: 20, h: 5 });
  });

  it("falls back to raw dimensions when no packing results exist", () => {
    const picked = pickSelectedPackingDims([], 0, fallbackDims);
    expect(picked).toEqual({ l: 20, w: 10, h: 5 });
  });
});

describe("toCmDimensions", () => {
  it.each([
    { unit: "cm", expected: { lengthCm: 10, widthCm: 20, heightCm: 30 } },
    { unit: "mm", expected: { lengthCm: 1, widthCm: 2, heightCm: 3 } },
    { unit: "in", expected: { lengthCm: 25.4, widthCm: 50.8, heightCm: 76.2 } },
  ] satisfies Array<{
    unit: SupportedUnit;
    expected: { lengthCm: number; widthCm: number; heightCm: number };
  }>)("converts from $unit into centimeters", ({ unit, expected }) => {
    const cmDims = toCmDimensions({ l: 10, w: 20, h: 30 }, unit);
    expect(cmDims).toEqual(expected);
  });
});

describe("buildPricingPhysicalInputs", () => {
  it("uses selected packing option and appends actual weight", () => {
    const physical = buildPricingPhysicalInputs({
      packingResults,
      selectedPackingIndex: 1,
      fallbackDims,
      unit: "cm",
      actualWeightKg: 3.2,
    });

    expect(physical).toEqual({
      actualWeightKg: 3.2,
      lengthCm: 20,
      widthCm: 20,
      heightCm: 10,
    });
  });
});
