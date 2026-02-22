import {
  calculatePackingResults,
  type PackingDims,
  type PackingLayoutSegment,
} from "../lib/packing";
import {
  calculateChargeableWeightKg,
  calculateFulfillmentFeePerItemCny,
  calculatePerItemCostFromBoxCost,
  calculatePurchaseCostByUnit,
  calculateVolumetricWeightKg,
  summarizePricing,
  type CostInputs,
} from "../lib/pricing";
import { calculateFirstLegByChannel } from "../lib/firstLegPricing";
import { buildPricingPhysicalInputs, pickSelectedPackingDims } from "../lib/skuWorkflow";
import type {
  FirstLegPricingConfig,
  ResolvedLayoutLayer,
  ResolvedLayoutSegment,
  SkuComputed,
  SkuConfig,
} from "./types";

export const toCurrencyText = (value: number | null): string =>
  value === null ? "--" : value.toFixed(2);

export const toPercentText = (value: number | null): string =>
  value === null ? "--" : `${(value * 100).toFixed(2)}%`;

export const toDimensionText = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded}`;
  }

  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export const clampPercent = (value: number, max: number = 100): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(value, max);
};

export const getLayerLabel = (index: number, total: number): string => {
  if (total <= 1) {
    return "整层";
  }
  if (index === 0) {
    return "底层";
  }
  if (index === total - 1) {
    return "顶层";
  }

  return `中层${index}`;
};

export const getGridDividerRatios = (count: number, maxDividers = 8): number[] => {
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  if (safeCount <= 1) {
    return [];
  }

  const step = Math.max(1, Math.ceil(safeCount / Math.max(1, maxDividers)));
  const dividers: number[] = [];
  for (let i = step; i < safeCount; i += step) {
    dividers.push(i / safeCount);
  }

  return dividers;
};

export const getBoundaryRatiosByValues = (values: number[]): number[] => {
  const safeValues = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = safeValues.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || safeValues.length <= 1) {
    return [];
  }

  let accumulated = 0;
  const boundaries: number[] = [];
  for (let i = 0; i < safeValues.length - 1; i += 1) {
    accumulated += safeValues[i];
    boundaries.push(accumulated / total);
  }

  return boundaries;
};

const getUniqueUnitOrientations = (
  dims: PackingDims,
): Array<{ length: number; width: number; height: number }> => {
  const permutations: Array<[number, number, number]> = [
    [dims.length, dims.width, dims.height],
    [dims.length, dims.height, dims.width],
    [dims.width, dims.length, dims.height],
    [dims.width, dims.height, dims.length],
    [dims.height, dims.length, dims.width],
    [dims.height, dims.width, dims.length],
  ];
  const unique: Array<{ length: number; width: number; height: number }> = [];
  const seen = new Set<string>();

  for (const [length, width, height] of permutations) {
    const key = `${length},${width},${height}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({ length, width, height });
  }

  return unique;
};

const getRelativeError = (actual: number, expected: number): number => {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || actual <= 0 || expected <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(actual - expected) / expected;
};

const resolveLayerDirection = (
  layer: PackingLayoutSegment,
  boxDims: { l: number; w: number; h: number },
  unitDims: PackingDims,
): {
  countAlongLength: number;
  countAlongWidth: number;
  nxAxis: "L" | "W";
  nyAxis: "L" | "W";
  inferredLayerHeight: number;
} => {
  const safeNx = Math.max(1, Number.isFinite(layer.nx) ? Math.floor(layer.nx) : 1);
  const safeNy = Math.max(1, Number.isFinite(layer.ny) ? Math.floor(layer.ny) : 1);
  const candidates: Array<{
    countAlongLength: number;
    countAlongWidth: number;
    nxAxis: "L" | "W";
    nyAxis: "L" | "W";
  }> = [
    {
      countAlongLength: safeNx,
      countAlongWidth: safeNy,
      nxAxis: "L",
      nyAxis: "W",
    },
    {
      countAlongLength: safeNy,
      countAlongWidth: safeNx,
      nxAxis: "W",
      nyAxis: "L",
    },
  ];
  const orientations = getUniqueUnitOrientations(unitDims);
  let bestMatch:
    | (typeof candidates)[number] & {
        inferredLayerHeight: number;
        score: number;
      }
    | null = null;

  for (const candidate of candidates) {
    const unitLengthAlongBoxLength = boxDims.l / candidate.countAlongLength;
    const unitWidthAlongBoxWidth = boxDims.w / candidate.countAlongWidth;

    for (const orientation of orientations) {
      const score =
        getRelativeError(unitLengthAlongBoxLength, orientation.length) +
        getRelativeError(unitWidthAlongBoxWidth, orientation.width);

      if (bestMatch === null || score < bestMatch.score) {
        bestMatch = {
          ...candidate,
          inferredLayerHeight: orientation.height,
          score,
        };
      }
    }
  }

  if (bestMatch) {
    return {
      countAlongLength: bestMatch.countAlongLength,
      countAlongWidth: bestMatch.countAlongWidth,
      nxAxis: bestMatch.nxAxis,
      nyAxis: bestMatch.nyAxis,
      inferredLayerHeight: bestMatch.inferredLayerHeight,
    };
  }

  return {
    countAlongLength: safeNx,
    countAlongWidth: safeNy,
    nxAxis: "L",
    nyAxis: "W",
    inferredLayerHeight: boxDims.h,
  };
};

export const resolveLayoutSegments = (
  segments: PackingLayoutSegment[],
  boxDims: { l: number; w: number; h: number },
  unitDims: PackingDims,
): ResolvedLayoutSegment[] => {
  if (segments.length === 0) {
    return [];
  }

  const inferred = segments.map((segment) => {
    const direction = resolveLayerDirection(segment, boxDims, unitDims);
    const safeNz = Math.max(1, Number.isFinite(segment.nz) ? Math.floor(segment.nz) : 1);
    const rawSingleLayerHeight = Math.max(0, direction.inferredLayerHeight);
    return {
      ...segment,
      nz: safeNz,
      countAlongLength: direction.countAlongLength,
      countAlongWidth: direction.countAlongWidth,
      nxAxis: direction.nxAxis,
      nyAxis: direction.nyAxis,
      singleLayerHeight: rawSingleLayerHeight,
      segmentHeight: rawSingleLayerHeight * safeNz,
    };
  });

  const totalRawHeight = inferred.reduce((sum, segment) => sum + segment.segmentHeight, 0);
  const scale = totalRawHeight > 0 ? boxDims.h / totalRawHeight : 0;
  const layerCount = inferred.reduce((sum, segment) => sum + segment.nz, 0);
  const fallbackSingleLayerHeight = layerCount > 0 ? boxDims.h / layerCount : 0;

  return inferred.map((segment) => {
    if (scale > 0) {
      const normalizedSingleLayerHeight = segment.singleLayerHeight * scale;
      return {
        ...segment,
        singleLayerHeight: normalizedSingleLayerHeight,
        segmentHeight: normalizedSingleLayerHeight * segment.nz,
      };
    }

    return {
      ...segment,
      singleLayerHeight: fallbackSingleLayerHeight,
      segmentHeight: fallbackSingleLayerHeight * segment.nz,
    };
  });
};

export const expandResolvedLayers = (
  resolvedSegments: ResolvedLayoutSegment[],
): ResolvedLayoutLayer[] => {
  const layers: ResolvedLayoutLayer[] = [];

  for (const segment of resolvedSegments) {
    for (let i = 0; i < segment.nz; i += 1) {
      layers.push({
        nx: segment.nx,
        ny: segment.ny,
        nz: 1,
        countAlongLength: segment.countAlongLength,
        countAlongWidth: segment.countAlongWidth,
        nxAxis: segment.nxAxis,
        nyAxis: segment.nyAxis,
        layerHeight: segment.singleLayerHeight,
      });
    }
  }

  return layers;
};

const DEPTH_PROJECTION_ANGLE_RAD = (32 * Math.PI) / 180;
const DEPTH_PROJECTION_COS = Math.cos(DEPTH_PROJECTION_ANGLE_RAD);
const DEPTH_PROJECTION_SIN = Math.sin(DEPTH_PROJECTION_ANGLE_RAD);

const normalizePositive = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export type ProjectedPreviewDimensions = {
  length: number;
  height: number;
  depthX: number;
  depthY: number;
};

export const getProjectedPreviewDimensions = (
  dims: { l: number; w: number; h: number },
  limits: { maxProjectedWidth: number; maxProjectedHeight: number },
): ProjectedPreviewDimensions => {
  const safeLength = normalizePositive(dims.l);
  const safeWidth = normalizePositive(dims.w);
  const safeHeight = normalizePositive(dims.h);
  const safeMaxProjectedWidth = Math.max(1, normalizePositive(limits.maxProjectedWidth));
  const safeMaxProjectedHeight = Math.max(1, normalizePositive(limits.maxProjectedHeight));

  if (!safeLength || !safeWidth || !safeHeight) {
    return { length: 0, height: 0, depthX: 0, depthY: 0 };
  }

  const projectedWidthUnits = safeLength + safeWidth * DEPTH_PROJECTION_COS;
  const projectedHeightUnits = safeHeight + safeWidth * DEPTH_PROJECTION_SIN;

  if (!projectedWidthUnits || !projectedHeightUnits) {
    return { length: 0, height: 0, depthX: 0, depthY: 0 };
  }

  const scale = Math.min(
    safeMaxProjectedWidth / projectedWidthUnits,
    safeMaxProjectedHeight / projectedHeightUnits,
  );
  const toPixel = (value: number) => Math.max(1, Math.round(value * scale));

  return {
    length: toPixel(safeLength),
    height: toPixel(safeHeight),
    depthX: toPixel(safeWidth * DEPTH_PROJECTION_COS),
    depthY: toPixel(safeWidth * DEPTH_PROJECTION_SIN),
  };
};

export const getSkuComputed = (
  sku: SkuConfig,
  firstLegPricingConfig: FirstLegPricingConfig,
): SkuComputed => {
  const packingResults = calculatePackingResults(sku.dims, sku.quantity, sku.maxResults);
  const effectiveSelectedIndex = packingResults[sku.selectedPackingIndex]
    ? sku.selectedPackingIndex
    : 0;
  const selectedResult = packingResults[effectiveSelectedIndex] ?? null;
  const selectedDims = pickSelectedPackingDims(
    packingResults,
    sku.selectedPackingIndex,
    sku.dims,
  );
  const pricingPhysical = buildPricingPhysicalInputs({
    packingResults,
    selectedPackingIndex: sku.selectedPackingIndex,
    fallbackDims: sku.dims,
    unit: sku.unit,
    actualWeightKg: sku.actualWeightKg,
  });
  const volumetricWeightKg = calculateVolumetricWeightKg(pricingPhysical);
  const chargeableWeightKg = calculateChargeableWeightKg(
    pricingPhysical.actualWeightKg,
    volumetricWeightKg,
  );
  const firstLegPricing = calculateFirstLegByChannel({
    channel: sku.firstLegChannel,
    chargeableWeightKg,
    originRegion: sku.originRegion,
    flatRatePerKgByChannel: firstLegPricingConfig.flatRatePerKgByChannel,
    airExpressRateTable: firstLegPricingConfig.airExpressRateTable,
    destinationWarehouseId: sku.destinationWarehouseId,
    expressSeaRateTable: firstLegPricingConfig.expressSeaRateTable,
    standardSeaRateTable: firstLegPricingConfig.standardSeaRateTable,
    economySeaRateTable: firstLegPricingConfig.economySeaRateTable,
  });
  const purchaseCostBoxCny = calculatePurchaseCostByUnit(
    sku.unitPurchasePrice,
    sku.quantity,
  );
  const perItemCostBreakdown: CostInputs = {
    purchaseCost: calculatePerItemCostFromBoxCost(purchaseCostBoxCny, sku.quantity),
    sourceToHomeExpressCost: calculatePerItemCostFromBoxCost(
      sku.costs.sourceToHomeExpressCost,
      sku.quantity,
    ),
    domesticWarehouseExpressCost: calculatePerItemCostFromBoxCost(
      sku.costs.domesticWarehouseExpressCost,
      sku.quantity,
    ),
    firstLegCost: calculatePerItemCostFromBoxCost(firstLegPricing.firstLegCost, sku.quantity),
    fbtFulfillmentFee: calculateFulfillmentFeePerItemCny(
      sku.costs.fbtFulfillmentFeeUsdPerItem,
      sku.costs.usdToCnyRate,
    ),
  };
  const pricingSummary = summarizePricing({
    firstLegChannel: sku.firstLegChannel,
    costs: perItemCostBreakdown,
    physical: pricingPhysical,
    targetRate: sku.targetRatePercent / 100,
    targetRateMode: sku.targetRateMode,
    returnRate: sku.returnRatePercent / 100,
    discountRate: sku.discountRatePercent / 100,
  });

  return {
    packingResults,
    selectedResult,
    selectedDims,
    purchaseCostBoxCny,
    perItemCostBreakdown,
    firstLegPricing,
    pricingSummary,
    pricingPhysical,
    effectiveSelectedIndex,
  };
};
