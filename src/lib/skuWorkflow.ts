import type { PackingDims, PackingResult } from "./packing";

export type SupportedUnit = "cm" | "mm" | "in";

export type BoxDims = {
  l: number;
  w: number;
  h: number;
};

export type CmDimensions = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

const UNIT_TO_CM_FACTOR: Record<SupportedUnit, number> = {
  cm: 1,
  mm: 0.1,
  in: 2.54,
};

export const pickSelectedPackingDims = (
  packingResults: PackingResult[],
  selectedPackingIndex: number,
  fallbackDims: PackingDims,
): BoxDims => {
  const selected = packingResults[selectedPackingIndex];
  if (selected) {
    return selected.dims;
  }

  const topResult = packingResults[0];
  if (topResult) {
    return topResult.dims;
  }

  return {
    l: fallbackDims.length,
    w: fallbackDims.width,
    h: fallbackDims.height,
  };
};

export const toCmDimensions = (dims: BoxDims, unit: SupportedUnit): CmDimensions => {
  const factor = UNIT_TO_CM_FACTOR[unit];
  return {
    lengthCm: dims.l * factor,
    widthCm: dims.w * factor,
    heightCm: dims.h * factor,
  };
};

export const buildPricingPhysicalInputs = (params: {
  packingResults: PackingResult[];
  selectedPackingIndex: number;
  fallbackDims: PackingDims;
  unit: SupportedUnit;
  actualWeightKg: number;
}): { actualWeightKg: number } & CmDimensions => {
  const selectedDims = pickSelectedPackingDims(
    params.packingResults,
    params.selectedPackingIndex,
    params.fallbackDims,
  );
  const cmDims = toCmDimensions(selectedDims, params.unit);

  return {
    actualWeightKg: params.actualWeightKg,
    ...cmDims,
  };
};
