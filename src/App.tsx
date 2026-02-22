import React, { useMemo, useState } from "react";
import {
  Box,
  Check,
  ChevronRight,
  Info,
  LayoutGrid,
  Package,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  calculatePackingResults,
  getNormalizedLayerGridPreview,
  parseLayoutSegments,
  type PackingLayoutSegment,
  type PackingDims,
  type PackingResult,
} from "./lib/packing";
import {
  calculateChargeableWeightKg,
  calculateCnyToUsd,
  calculateFulfillmentFeePerItemCny,
  calculatePerItemCostFromBoxCost,
  calculatePurchaseCostByUnit,
  calculateVolumetricWeightKg,
  summarizePricing,
  type CostInputs,
  type FirstLegChannel,
  type PricingSummary,
  type TargetRateMode,
} from "./lib/pricing";
import {
  calculateFirstLegByChannel,
  defaultAirExpressRateTable,
  defaultEconomySeaRateTable,
  defaultExpressSeaRateTable,
  defaultStandardSeaRateTable,
  defaultFlatRatePerKgByChannel,
  originRegionLabels,
  type AirExpressRateTable,
  type ExpressSeaRateTable,
  type FlatRatePerKgByChannel,
  type FirstLegPricingResult,
  type OriginRegion,
} from "./lib/firstLegPricing";
import {
  getWarehouseById,
  tiktokUsWarehouses,
  warehouseRegionLabels,
  type WarehouseRegion,
} from "./lib/usWarehouses";
import {
  buildPricingPhysicalInputs,
  pickSelectedPackingDims,
  type SupportedUnit,
} from "./lib/skuWorkflow";

type Unit = SupportedUnit;
type SkuBaseCosts = {
  sourceToHomeExpressCost: number;
  domesticWarehouseExpressCost: number;
  fbtFulfillmentFeeUsdPerItem: number;
  usdToCnyRate: number;
};

type SkuConfig = {
  id: string;
  name: string;
  unit: Unit;
  dims: PackingDims;
  quantity: number;
  unitPurchasePrice: number;
  maxResults: number;
  selectedPackingIndex: number;
  actualWeightKg: number;
  destinationWarehouseId: string;
  originRegion: OriginRegion;
  firstLegChannel: FirstLegChannel;
  targetRateMode: TargetRateMode;
  targetRatePercent: number;
  returnRatePercent: number;
  discountRatePercent: number;
  costs: SkuBaseCosts;
};

type SkuComputed = {
  packingResults: PackingResult[];
  selectedResult: PackingResult | null;
  selectedDims: { l: number; w: number; h: number };
  purchaseCostBoxCny: number;
  perItemCostBreakdown: CostInputs;
  pricingSummary: PricingSummary;
  firstLegPricing: FirstLegPricingResult;
  pricingPhysical: {
    actualWeightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  effectiveSelectedIndex: number;
};

type ResolvedLayoutLayer = PackingLayoutSegment & {
  countAlongLength: number;
  countAlongWidth: number;
  nxAxis: "L" | "W";
  nyAxis: "L" | "W";
  layerHeight: number;
};

type ResolvedLayoutSegment = PackingLayoutSegment & {
  countAlongLength: number;
  countAlongWidth: number;
  nxAxis: "L" | "W";
  nyAxis: "L" | "W";
  singleLayerHeight: number;
  segmentHeight: number;
};

const FIRST_LEG_CHANNEL_OPTIONS: Array<{
  value: FirstLegChannel;
  label: string;
  shippingType: "海运" | "空运";
}> = [
  { value: "fbt_us_express_sea_truck", label: "FBT-US特快海卡", shippingType: "海运" },
  {
    value: "fbt_us_standard_sea_truck",
    label: "FBT-US标快海卡（以星合德带车架统配）",
    shippingType: "海运",
  },
  {
    value: "fbt_us_economy_sea_truck",
    label: "FBT-US经济海卡（OA普船）",
    shippingType: "海运",
  },
  { value: "fbt_air_express", label: "FBT空派限时达", shippingType: "空运" },
];

const AIR_ZONE_LABELS = {
  west: "美西仓",
  central: "美中仓",
  east: "美东仓",
} as const;

const FIRST_LEG_TIER_LABELS = {
  "12_20": "12-20KG",
  "21_100": "21-100KG",
  "101_plus": "101KG+",
  "12_plus": "12KG+",
  "51_plus": "51KG+",
  "100_plus": "100KG+",
  "500_plus": "500KG+",
  "1000_plus": "1000KG+",
} as const;

const WAREHOUSE_REGION_ORDER: WarehouseRegion[] = ["west", "central", "east"];

const createDefaultSku = (index: number): SkuConfig => ({
  id: `sku-${index}`,
  name: `SKU ${index}`,
  unit: "cm",
  dims: { length: 10, width: 10, height: 10 },
  quantity: 12,
  unitPurchasePrice: 0,
  maxResults: 6,
  selectedPackingIndex: 0,
  actualWeightKg: 1,
  destinationWarehouseId: "WPOCA",
  originRegion: "east_china",
  firstLegChannel: "fbt_us_standard_sea_truck",
  targetRateMode: "margin_on_sale_price",
  targetRatePercent: 25,
  returnRatePercent: 10,
  discountRatePercent: 100,
  costs: {
    sourceToHomeExpressCost: 0,
    domesticWarehouseExpressCost: 0,
    fbtFulfillmentFeeUsdPerItem: 0,
    usdToCnyRate: 7.2,
  },
});

const toCurrencyText = (value: number | null): string =>
  value === null ? "--" : value.toFixed(2);
const toPercentText = (value: number | null): string =>
  value === null ? "--" : `${(value * 100).toFixed(2)}%`;
const toDimensionText = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded}`;
  }

  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const clampPercent = (value: number, max: number = 100): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(value, max);
};

const getLayerLabel = (index: number, total: number): string => {
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

const getGridDividerRatios = (count: number, maxDividers = 8): number[] => {
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

const getBoundaryRatiosByValues = (values: number[]): number[] => {
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

const resolveLayoutSegments = (
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
  const fallbackSingleLayerHeight = boxDims.h / inferred.reduce((sum, segment) => sum + segment.nz, 0);

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

const DEPTH_PROJECTION_ANGLE_RAD = (32 * Math.PI) / 180;
const DEPTH_PROJECTION_COS = Math.cos(DEPTH_PROJECTION_ANGLE_RAD);
const DEPTH_PROJECTION_SIN = Math.sin(DEPTH_PROJECTION_ANGLE_RAD);

const normalizePositive = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const getProjectedPreviewDimensions = (
  dims: { l: number; w: number; h: number },
  limits: { maxProjectedWidth: number; maxProjectedHeight: number },
): { length: number; height: number; depthX: number; depthY: number } => {
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

const getSkuComputed = (
  sku: SkuConfig,
  firstLegPricingConfig: {
    flatRatePerKgByChannel: FlatRatePerKgByChannel;
    airExpressRateTable: AirExpressRateTable;
    expressSeaRateTable: ExpressSeaRateTable;
    standardSeaRateTable: ExpressSeaRateTable;
    economySeaRateTable: ExpressSeaRateTable;
  },
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
    firstLegCost: calculatePerItemCostFromBoxCost(
      firstLegPricing.firstLegCost,
      sku.quantity,
    ),
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

const App = () => {
  const [skus, setSkus] = useState<SkuConfig[]>([createDefaultSku(1)]);
  const [activeSkuId, setActiveSkuId] = useState("sku-1");
  const [nextSkuIndex, setNextSkuIndex] = useState(2);
  const flatRatePerKgByChannel: FlatRatePerKgByChannel = defaultFlatRatePerKgByChannel;
  const airExpressRateTable: AirExpressRateTable = defaultAirExpressRateTable;
  const [expressSeaRateTable] = useState<ExpressSeaRateTable>(
    defaultExpressSeaRateTable,
  );
  const [standardSeaRateTable] = useState<ExpressSeaRateTable>(
    defaultStandardSeaRateTable,
  );
  const [economySeaRateTable] = useState<ExpressSeaRateTable>(
    defaultEconomySeaRateTable,
  );

  const activeSku = skus.find((item) => item.id === activeSkuId) ?? skus[0];
  if (!activeSku) {
    return null;
  }

  const patchActiveSku = (updater: (sku: SkuConfig) => SkuConfig) => {
    setSkus((prev) => prev.map((sku) => (sku.id === activeSku.id ? updater(sku) : sku)));
  };

  const addSku = () => {
    const next = createDefaultSku(nextSkuIndex);
    setSkus((prev) => [...prev, next]);
    setActiveSkuId(next.id);
    setNextSkuIndex((prev) => prev + 1);
  };

  const removeSku = (id: string) => {
    setSkus((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const removedIndex = prev.findIndex((item) => item.id === id);
      const next = prev.filter((item) => item.id !== id);

      if (id === activeSkuId) {
        const replacement = next[removedIndex] ?? next[removedIndex - 1] ?? next[0];
        if (replacement) {
          setActiveSkuId(replacement.id);
        }
      }

      return next;
    });
  };

  const activeComputed = useMemo(
    () =>
      getSkuComputed(activeSku, {
        flatRatePerKgByChannel,
        airExpressRateTable,
        expressSeaRateTable,
        standardSeaRateTable,
        economySeaRateTable,
      }),
    [
      activeSku,
      airExpressRateTable,
      economySeaRateTable,
      expressSeaRateTable,
      flatRatePerKgByChannel,
      standardSeaRateTable,
    ],
  );
  const selectedChannel = FIRST_LEG_CHANNEL_OPTIONS.find(
    (option) => option.value === activeSku.firstLegChannel,
  );
  const suggestedPriceUsd = calculateCnyToUsd(
    activeComputed.pricingSummary.predictedSellingPrice,
    activeSku.costs.usdToCnyRate,
  );
  const discountedPriceUsd = calculateCnyToUsd(
    activeComputed.pricingSummary.discountedSellingPrice,
    activeSku.costs.usdToCnyRate,
  );
  const selectedPackingResult = activeComputed.selectedResult;
  const selectedLayoutLayers = useMemo<ResolvedLayoutLayer[]>(() => {
    if (!selectedPackingResult) {
      return [];
    }

    const resolvedSegments = resolveLayoutSegments(
      parseLayoutSegments(selectedPackingResult.layout),
      selectedPackingResult.dims,
      activeSku.dims,
    );
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
  }, [activeSku.dims, selectedPackingResult]);
  const selectedLayerBoundaries = getBoundaryRatiosByValues(
    selectedLayoutLayers.map((layer) => layer.layerHeight),
  );
  const selectedPreview = selectedPackingResult
    ? getProjectedPreviewDimensions(selectedPackingResult.dims, {
        maxProjectedWidth: 138,
        maxProjectedHeight: 100,
      })
    : null;
  const selectedPreviewFrontX = 26;
  const selectedPreviewFrontWidth = selectedPreview?.length ?? 0;
  const selectedPreviewFrontHeight = selectedPreview?.height ?? 0;
  const selectedPreviewFrontY = 142 - selectedPreviewFrontHeight;
  const selectedPreviewDepthX = selectedPreview?.depthX ?? 0;
  const selectedPreviewDepthY = selectedPreview?.depthY ?? 0;
  const activeWarehouse = getWarehouseById(activeSku.destinationWarehouseId);
  const warehousesByRegion = useMemo(
    () =>
      WAREHOUSE_REGION_ORDER.reduce<Record<WarehouseRegion, typeof tiktokUsWarehouses>>(
        (acc, region) => {
          acc[region] = tiktokUsWarehouses.filter((warehouse) => warehouse.region === region);
          return acc;
        },
        { west: [], central: [], east: [] },
      ),
    [],
  );

  const skuSnapshots = useMemo(
    () =>
      skus.map((sku) => {
        const computed = getSkuComputed(sku, {
          flatRatePerKgByChannel,
          airExpressRateTable,
          expressSeaRateTable,
          standardSeaRateTable,
          economySeaRateTable,
        });

        return {
          id: sku.id,
          name: sku.name,
          layout: computed.selectedResult?.layout ?? "--",
          suggestedPrice: computed.pricingSummary.predictedSellingPrice,
        };
      }),
    [
      airExpressRateTable,
      economySeaRateTable,
      expressSeaRateTable,
      flatRatePerKgByChannel,
      skus,
      standardSeaRateTable,
    ],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-200">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SKU 外箱与售价联动计算器</h1>
            <p className="text-sm font-medium text-gray-500">
              先选外箱方案，再自动联动计费重、成本和目标售价
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">SKU 列表</h2>
                <button
                  type="button"
                  onClick={addSku}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增
                </button>
              </div>

              <div className="space-y-2">
                {skuSnapshots.map((snapshot) => {
                  const isActive = snapshot.id === activeSku.id;
                  return (
                    <div key={snapshot.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSkuId(snapshot.id)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{snapshot.name}</span>
                          {isActive ? <Check className="h-4 w-4 text-blue-600" /> : null}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">堆叠: {snapshot.layout}</div>
                        <div className="text-xs text-gray-500">
                          建议标价: {toCurrencyText(snapshot.suggestedPrice)}
                        </div>
                      </button>
                      {skus.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSku(snapshot.id)}
                          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:text-red-500"
                          aria-label={`删除 ${snapshot.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-xs leading-relaxed text-blue-700">
                每个 SKU 独立维护参数与目标售价。默认按“一 SKU 一箱”进行联动计算。
              </p>
            </div>
          </aside>

          <main className="space-y-6 lg:col-span-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                <LayoutGrid className="h-5 w-5 text-blue-500" />
                第一步：外箱方案
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    SKU 名称
                  </label>
                  <input
                    value={activeSku.name}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        name: event.target.value || sku.name,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    单位
                  </label>
                  <select
                    value={activeSku.unit}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        unit: event.target.value as Unit,
                        selectedPackingIndex: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cm">厘米 (cm)</option>
                    <option value="mm">毫米 (mm)</option>
                    <option value="in">英寸 (in)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    打包数量
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={activeSku.quantity}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                        selectedPackingIndex: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    SKU 单价 (元/件)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={activeSku.unitPurchasePrice}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        unitPurchasePrice: clampNonNegative(
                          Number.parseFloat(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                        长度
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeSku.dims.length}
                        onChange={(event) =>
                          patchActiveSku((sku) => ({
                            ...sku,
                            dims: {
                              ...sku.dims,
                              length: clampNonNegative(
                                Number.parseFloat(event.target.value) || 0,
                              ),
                            },
                            selectedPackingIndex: 0,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                        宽度
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeSku.dims.width}
                        onChange={(event) =>
                          patchActiveSku((sku) => ({
                            ...sku,
                            dims: {
                              ...sku.dims,
                              width: clampNonNegative(
                                Number.parseFloat(event.target.value) || 0,
                              ),
                            },
                            selectedPackingIndex: 0,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                        高度
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeSku.dims.height}
                        onChange={(event) =>
                          patchActiveSku((sku) => ({
                            ...sku,
                            dims: {
                              ...sku.dims,
                              height: clampNonNegative(
                                Number.parseFloat(event.target.value) || 0,
                              ),
                            },
                            selectedPackingIndex: 0,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    显示方案数
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={activeSku.maxResults}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        maxResults: Math.min(
                          12,
                          Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                        ),
                        selectedPackingIndex: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {activeComputed.packingResults.length > 0 ? (
                  activeComputed.packingResults.map((result, index) => {
                    const isSelected = index === activeComputed.effectiveSelectedIndex;
                    const preview = getProjectedPreviewDimensions(result.dims, {
                      maxProjectedWidth: 58,
                      maxProjectedHeight: 40,
                    });
                    const resolvedLayoutSegments = resolveLayoutSegments(
                      parseLayoutSegments(result.layout),
                      result.dims,
                      activeSku.dims,
                    );
                    const layerBoundaries = getBoundaryRatiosByValues(
                      resolvedLayoutSegments.map((segment) => segment.segmentHeight),
                    );
                    const frontX = 16;
                    const frontY = 52 - preview.height;
                    const frontWidth = preview.length;
                    const frontHeight = preview.height;
                    const depthX = preview.depthX;
                    const depthY = preview.depthY;
                    const axisColor = isSelected ? "#1d4ed8" : "#64748b";
                    const axisTextColor = isSelected ? "#1e3a8a" : "#475569";
                    return (
                      <button
                        key={`${result.layout}-${index}`}
                        type="button"
                        onClick={() =>
                          patchActiveSku((sku) => ({
                            ...sku,
                            selectedPackingIndex: index,
                          }))
                        }
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-xs font-medium text-gray-500">
                              方案 {index + 1}
                            </div>
                            <div className="font-semibold text-gray-800">
                              {result.layout}
                              <span className="ml-1 text-xs font-normal text-gray-500">
                                (行列层)
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {result.dims.l} × {result.dims.w} × {result.dims.h} {activeSku.unit}
                            </div>
                            {resolvedLayoutSegments.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {resolvedLayoutSegments.map((segment, segmentIndex) => {
                                  const xDividers = getGridDividerRatios(
                                    segment.countAlongLength,
                                    5,
                                  );
                                  const yDividers = getGridDividerRatios(
                                    segment.countAlongWidth,
                                    5,
                                  );
                                  const segmentPreview = getNormalizedLayerGridPreview(
                                    result.dims.l,
                                    result.dims.w,
                                    22,
                                  );
                                  const segmentRectX = (28 - segmentPreview.width) / 2;
                                  const segmentRectY = (28 - segmentPreview.height) / 2;
                                  return (
                                    <div
                                      key={`${result.layout}-segment-${segmentIndex}`}
                                      className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] ${
                                        isSelected
                                          ? "border-blue-200 bg-blue-100/70 text-blue-800"
                                          : "border-gray-200 bg-gray-50 text-gray-600"
                                      }`}
                                    >
                                      <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0">
                                        <rect
                                          x={segmentRectX}
                                          y={segmentRectY}
                                          width={segmentPreview.width}
                                          height={segmentPreview.height}
                                          fill={isSelected ? "#dbeafe" : "#f8fafc"}
                                          stroke={isSelected ? "#2563eb" : "#94a3b8"}
                                          strokeWidth="1"
                                        />
                                        {xDividers.map((ratio) => (
                                          <line
                                            key={`x-${ratio}`}
                                            x1={segmentRectX + segmentPreview.width * ratio}
                                            y1={segmentRectY}
                                            x2={segmentRectX + segmentPreview.width * ratio}
                                            y2={segmentRectY + segmentPreview.height}
                                            stroke={isSelected ? "#93c5fd" : "#cbd5e1"}
                                            strokeWidth="0.7"
                                          />
                                        ))}
                                        {yDividers.map((ratio) => (
                                          <line
                                            key={`y-${ratio}`}
                                            x1={segmentRectX}
                                            y1={segmentRectY + segmentPreview.height * ratio}
                                            x2={segmentRectX + segmentPreview.width}
                                            y2={segmentRectY + segmentPreview.height * ratio}
                                            stroke={isSelected ? "#93c5fd" : "#cbd5e1"}
                                            strokeWidth="0.7"
                                          />
                                        ))}
                                      </svg>
                                      <div className="leading-tight">
                                        <div className="font-medium">
                                          {getLayerLabel(segmentIndex, resolvedLayoutSegments.length)}
                                        </div>
                                        <div className="font-semibold">
                                          {segment.nx} × {segment.ny} × {segment.nz}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                          nx→{segment.nxAxis}，ny→{segment.nyAxis}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3">
                            <svg viewBox="0 0 130 84" className="h-[62px] w-[104px] shrink-0">
                              <polygon
                                points={`${frontX},${frontY} ${frontX + depthX},${frontY - depthY} ${
                                  frontX + depthX + frontWidth
                                },${frontY - depthY} ${frontX + frontWidth},${frontY}`}
                                fill={isSelected ? "#bfdbfe" : "#e5e7eb"}
                                stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                                strokeWidth="1"
                              />
                              <polygon
                                points={`${frontX + frontWidth},${frontY} ${
                                  frontX + depthX + frontWidth
                                },${frontY - depthY} ${frontX + depthX + frontWidth},${
                                  frontY + frontHeight - depthY
                                } ${frontX + frontWidth},${frontY + frontHeight}`}
                                fill={isSelected ? "#93c5fd" : "#d1d5db"}
                                stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                                strokeWidth="1"
                              />
                              <rect
                                x={frontX}
                                y={frontY}
                                width={frontWidth}
                                height={frontHeight}
                                fill={isSelected ? "#dbeafe" : "#f3f4f6"}
                                stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                                strokeWidth="1"
                              />
                              {layerBoundaries.map((ratio) => (
                                <line
                                  key={`layer-${ratio}`}
                                  x1={frontX}
                                  y1={frontY + frontHeight * ratio}
                                  x2={frontX + frontWidth}
                                  y2={frontY + frontHeight * ratio}
                                  stroke={isSelected ? "#60a5fa" : "#cbd5e1"}
                                  strokeWidth="0.9"
                                />
                              ))}
                              <line
                                x1={frontX}
                                y1={frontY + frontHeight + 6}
                                x2={frontX + frontWidth}
                                y2={frontY + frontHeight + 6}
                                stroke={axisColor}
                                strokeWidth="0.8"
                              />
                              <line
                                x1={frontX + frontWidth + 2}
                                y1={frontY + frontHeight + 1}
                                x2={frontX + frontWidth + depthX + 2}
                                y2={frontY + frontHeight - depthY + 1}
                                stroke={axisColor}
                                strokeWidth="0.8"
                              />
                              <line
                                x1={frontX - 6}
                                y1={frontY + frontHeight}
                                x2={frontX - 6}
                                y2={frontY}
                                stroke={axisColor}
                                strokeWidth="0.8"
                              />
                              <text
                                x={frontX + frontWidth / 2}
                                y={frontY + frontHeight + 12}
                                textAnchor="middle"
                                fontSize="5.6"
                                fill={axisTextColor}
                              >
                                L {result.dims.l}
                              </text>
                              <text
                                x={frontX + frontWidth + depthX / 2 + 3}
                                y={frontY + frontHeight - depthY / 2 + 1}
                                textAnchor="middle"
                                fontSize="5.6"
                                fill={axisTextColor}
                              >
                                W {result.dims.w}
                              </text>
                              <text
                                x={frontX - 9}
                                y={frontY + frontHeight / 2}
                                textAnchor="middle"
                                fontSize="5.6"
                                fill={axisTextColor}
                              >
                                H {result.dims.h}
                              </text>
                            </svg>
                            <div className="text-right text-xs text-gray-500">
                              <div>立体预览</div>
                              <div className="font-bold text-gray-700">{result.ratio} : 1</div>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 ${
                                isSelected ? "text-blue-500" : "text-gray-300"
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400">
                    <RotateCcw className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">请输入有效尺寸和数量后选择外箱方案</p>
                  </div>
                )}
              </div>

              {selectedPackingResult && selectedPreview ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">摆放方式大图</h3>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      共 {selectedLayoutLayers.length} 层
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <svg viewBox="0 0 250 170" className="h-[180px] w-full">
                        <polygon
                          points={`${selectedPreviewFrontX},${selectedPreviewFrontY} ${
                            selectedPreviewFrontX + selectedPreviewDepthX
                          },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                            selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                          },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                            selectedPreviewFrontX + selectedPreviewFrontWidth
                          },${selectedPreviewFrontY}`}
                          fill="#bfdbfe"
                          stroke="#1d4ed8"
                          strokeWidth="1.2"
                        />
                        <polygon
                          points={`${selectedPreviewFrontX + selectedPreviewFrontWidth},${
                            selectedPreviewFrontY
                          } ${
                            selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                          },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                            selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                          },${selectedPreviewFrontY + selectedPreviewFrontHeight - selectedPreviewDepthY} ${
                            selectedPreviewFrontX + selectedPreviewFrontWidth
                          },${selectedPreviewFrontY + selectedPreviewFrontHeight}`}
                          fill="#93c5fd"
                          stroke="#1d4ed8"
                          strokeWidth="1.2"
                        />
                        <rect
                          x={selectedPreviewFrontX}
                          y={selectedPreviewFrontY}
                          width={selectedPreviewFrontWidth}
                          height={selectedPreviewFrontHeight}
                          fill="#dbeafe"
                          stroke="#1d4ed8"
                          strokeWidth="1.2"
                        />
                        {selectedLayerBoundaries.map((ratio) => (
                          <line
                            key={`selected-layer-${ratio}`}
                            x1={selectedPreviewFrontX}
                            y1={selectedPreviewFrontY + selectedPreviewFrontHeight * ratio}
                            x2={selectedPreviewFrontX + selectedPreviewFrontWidth}
                            y2={selectedPreviewFrontY + selectedPreviewFrontHeight * ratio}
                            stroke="#60a5fa"
                            strokeWidth="1"
                          />
                        ))}
                        <line
                          x1={selectedPreviewFrontX}
                          y1={selectedPreviewFrontY + selectedPreviewFrontHeight + 12}
                          x2={selectedPreviewFrontX + selectedPreviewFrontWidth}
                          y2={selectedPreviewFrontY + selectedPreviewFrontHeight + 12}
                          stroke="#1e3a8a"
                          strokeWidth="1.2"
                        />
                        <line
                          x1={selectedPreviewFrontX + selectedPreviewFrontWidth + 3}
                          y1={selectedPreviewFrontY + selectedPreviewFrontHeight + 1}
                          x2={
                            selectedPreviewFrontX +
                            selectedPreviewFrontWidth +
                            selectedPreviewDepthX +
                            3
                          }
                          y2={
                            selectedPreviewFrontY +
                            selectedPreviewFrontHeight -
                            selectedPreviewDepthY +
                            1
                          }
                          stroke="#1e3a8a"
                          strokeWidth="1.2"
                        />
                        <line
                          x1={selectedPreviewFrontX - 10}
                          y1={selectedPreviewFrontY + selectedPreviewFrontHeight}
                          x2={selectedPreviewFrontX - 10}
                          y2={selectedPreviewFrontY}
                          stroke="#1e3a8a"
                          strokeWidth="1.2"
                        />
                        <text
                          x={selectedPreviewFrontX + selectedPreviewFrontWidth / 2}
                          y={selectedPreviewFrontY + selectedPreviewFrontHeight + 24}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#1e3a8a"
                        >
                          L {selectedPackingResult.dims.l} {activeSku.unit}
                        </text>
                        <text
                          x={
                            selectedPreviewFrontX +
                            selectedPreviewFrontWidth +
                            selectedPreviewDepthX / 2 +
                            6
                          }
                          y={
                            selectedPreviewFrontY +
                            selectedPreviewFrontHeight -
                            selectedPreviewDepthY / 2 +
                            2
                          }
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#1e3a8a"
                        >
                          W {selectedPackingResult.dims.w} {activeSku.unit}
                        </text>
                        <text
                          x={selectedPreviewFrontX - 14}
                          y={selectedPreviewFrontY + selectedPreviewFrontHeight / 2}
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#1e3a8a"
                        >
                          H {selectedPackingResult.dims.h} {activeSku.unit}
                        </text>
                      </svg>
                      <p className="mt-2 text-center text-xs font-medium text-slate-600">
                        外箱 {selectedPackingResult.dims.l} × {selectedPackingResult.dims.w} ×{" "}
                        {selectedPackingResult.dims.h} {activeSku.unit}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedLayoutLayers.map((layer, layerIndex) => {
                        const xDividers = getGridDividerRatios(layer.countAlongLength, 6);
                        const yDividers = getGridDividerRatios(layer.countAlongWidth, 6);
                        const units = layer.nx * layer.ny;
                        const layerHeight = layer.layerHeight;
                        const layerPreview = getNormalizedLayerGridPreview(
                          selectedPackingResult.dims.l,
                          selectedPackingResult.dims.w,
                          44,
                        );
                        const layerRectX = (56 - layerPreview.width) / 2;
                        const layerRectY = (56 - layerPreview.height) / 2;

                        return (
                          <div
                            key={`selected-layer-grid-${layerIndex}`}
                            className="rounded-lg border border-slate-200 bg-white p-2.5"
                          >
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">
                                {getLayerLabel(layerIndex, selectedLayoutLayers.length)}
                              </span>
                              <span className="text-slate-500">{units} 件</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg viewBox="0 0 56 56" className="h-12 w-12 shrink-0">
                                <rect
                                  x={layerRectX}
                                  y={layerRectY}
                                  width={layerPreview.width}
                                  height={layerPreview.height}
                                  fill="#f8fafc"
                                  stroke="#94a3b8"
                                  strokeWidth="1.1"
                                />
                                {xDividers.map((ratio) => (
                                  <line
                                    key={`selected-x-${layerIndex}-${ratio}`}
                                    x1={layerRectX + layerPreview.width * ratio}
                                    y1={layerRectY}
                                    x2={layerRectX + layerPreview.width * ratio}
                                    y2={layerRectY + layerPreview.height}
                                    stroke="#cbd5e1"
                                    strokeWidth="0.8"
                                  />
                                ))}
                                {yDividers.map((ratio) => (
                                  <line
                                    key={`selected-y-${layerIndex}-${ratio}`}
                                    x1={layerRectX}
                                    y1={layerRectY + layerPreview.height * ratio}
                                    x2={layerRectX + layerPreview.width}
                                    y2={layerRectY + layerPreview.height * ratio}
                                    stroke="#cbd5e1"
                                    strokeWidth="0.8"
                                  />
                                ))}
                              </svg>
                              <div className="leading-tight text-xs">
                                <div className="font-semibold text-slate-700">
                                  {layer.nx} 行 × {layer.ny} 列
                                </div>
                                <div className="text-slate-500">
                                  方向 nx→{layer.nxAxis}，ny→{layer.nyAxis}
                                </div>
                                <div className="text-slate-500">
                                  尺寸 {toDimensionText(selectedPackingResult.dims.l)} ×{" "}
                                  {toDimensionText(selectedPackingResult.dims.w)} ×{" "}
                                  {toDimensionText(layerHeight)} {activeSku.unit}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                <Box className="h-5 w-5 text-emerald-500" />
                第二步：物流与成本
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    头程渠道
                  </label>
                  <select
                    value={activeSku.firstLegChannel}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        firstLegChannel: event.target.value as FirstLegChannel,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    {FIRST_LEG_CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}（{option.shippingType}）
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    发货地
                  </label>
                  <select
                    value={activeSku.originRegion}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        originRegion: event.target.value as OriginRegion,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="east_china">华东</option>
                    <option value="south_china">华南</option>
                    <option value="fujian">福建</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    实际重量 (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={activeSku.actualWeightKg}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        actualWeightKg: clampNonNegative(
                          Number.parseFloat(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    目的海外仓
                  </label>
                  <select
                    value={activeSku.destinationWarehouseId}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        destinationWarehouseId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    {WAREHOUSE_REGION_ORDER.map((region) => (
                      <optgroup
                        key={region}
                        label={`${warehouseRegionLabels[region]} (${warehousesByRegion[region].length})`}
                      >
                        {warehousesByRegion[region].map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} [{warehouse.code}] {warehouse.city}, {warehouse.state}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                  体积重 = 长 × 宽 × 高(cm) / 6000，计费重 = max(实重, 体积重)。
                  <br />
                  物流相关费用按整箱录入，计算单件售价时会自动按数量分摊。
                  <br />
                  当前用于计费的箱规：{activeComputed.pricingPhysical.lengthCm.toFixed(2)} ×{" "}
                  {activeComputed.pricingPhysical.widthCm.toFixed(2)} ×{" "}
                  {activeComputed.pricingPhysical.heightCm.toFixed(2)} cm
                  <br />
                  当前头程计费：{activeComputed.firstLegPricing.details}
                  {activeComputed.firstLegPricing.zone ? (
                    <>
                      （{AIR_ZONE_LABELS[activeComputed.firstLegPricing.zone]} /{" "}
                      {activeComputed.firstLegPricing.tier
                        ? FIRST_LEG_TIER_LABELS[activeComputed.firstLegPricing.tier]
                        : "--"}
                      ）
                    </>
                  ) : null}
                  {activeWarehouse ? (
                    <>
                      ，当前仓库 {activeWarehouse.name} [{activeWarehouse.code}]，位于{" "}
                      {warehouseRegionLabels[activeWarehouse.region]}
                    </>
                  ) : null}
                  ，发货地 {originRegionLabels[activeSku.originRegion]}
                  ，单价 {activeComputed.firstLegPricing.ratePerKg.toFixed(2)} 元/kg，
                  计费重 {activeComputed.firstLegPricing.billableWeightKg.toFixed(3)} kg，
                  自动头程费 {toCurrencyText(activeComputed.firstLegPricing.firstLegCost)} 元/箱，
                  单件头程费 {toCurrencyText(activeComputed.perItemCostBreakdown.firstLegCost)} 元。
                </div>

                <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  采购成本（自动）= SKU单价 {toCurrencyText(activeSku.unitPurchasePrice)} ×
                  数量 {activeSku.quantity} = {toCurrencyText(activeComputed.purchaseCostBoxCny)} 元
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    货源地到家快递 (元/箱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={activeSku.costs.sourceToHomeExpressCost}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        costs: {
                          ...sku.costs,
                          sourceToHomeExpressCost: clampNonNegative(
                            Number.parseFloat(event.target.value) || 0,
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    到国内头程商仓库快递 (元/箱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={activeSku.costs.domesticWarehouseExpressCost}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        costs: {
                          ...sku.costs,
                          domesticWarehouseExpressCost: clampNonNegative(
                            Number.parseFloat(event.target.value) || 0,
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    FBT 履约费 (USD/件)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={activeSku.costs.fbtFulfillmentFeeUsdPerItem}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        costs: {
                          ...sku.costs,
                          fbtFulfillmentFeeUsdPerItem: clampNonNegative(
                            Number.parseFloat(event.target.value) || 0,
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    美元汇率 (USD-&gt;CNY)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={activeSku.costs.usdToCnyRate}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        costs: {
                          ...sku.costs,
                          usdToCnyRate: clampNonNegative(
                            Number.parseFloat(event.target.value) || 0,
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-800">第三步：目标售价</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    目标利率口径
                  </label>
                  <select
                    value={activeSku.targetRateMode}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        targetRateMode: event.target.value as TargetRateMode,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="margin_on_sale_price">按售价利润率</option>
                    <option value="markup_on_cost">按成本加价率</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    目标利率 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={activeSku.targetRatePercent}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        targetRatePercent: clampNonNegative(
                          Number.parseFloat(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    退货率 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={activeSku.returnRatePercent}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        returnRatePercent: clampPercent(
                          Number.parseFloat(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    折扣率 (%)（8 折 = 80）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={activeSku.discountRatePercent}
                    onChange={(event) =>
                      patchActiveSku((sku) => ({
                        ...sku,
                        discountRatePercent: clampPercent(
                          Number.parseFloat(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                当前流程：先按目标利率反推“退货后有效收入”，再结合退货率与折扣率，计算折后目标成交价与折前建议标价。
              </p>
            </section>
          </main>

          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">结果总览</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">SKU</span>
                  <span className="font-semibold text-gray-800">{activeSku.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">堆叠方式</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.selectedResult?.layout ?? "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">外箱规格</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.selectedDims.l} × {activeComputed.selectedDims.w} ×{" "}
                    {activeComputed.selectedDims.h} {activeSku.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">头程渠道</span>
                  <span className="text-right font-medium text-gray-700">
                    {selectedChannel?.label ?? "--"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500">目标仓库</span>
                  <span className="text-right font-medium text-gray-700">
                    {activeWarehouse
                      ? `${activeWarehouse.name} [${activeWarehouse.code}]`
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">发货地</span>
                  <span className="font-medium text-gray-700">
                    {originRegionLabels[activeSku.originRegion]}
                  </span>
                </div>
                {activeComputed.firstLegPricing.zone ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">仓库分区</span>
                    <span className="text-right font-medium text-gray-700">
                      {AIR_ZONE_LABELS[activeComputed.firstLegPricing.zone]}
                    </span>
                  </div>
                ) : null}
                {activeComputed.firstLegPricing.tier ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">计费梯度</span>
                    <span className="font-medium text-gray-700">
                      {FIRST_LEG_TIER_LABELS[activeComputed.firstLegPricing.tier]}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">体积重 (kg)</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.pricingSummary.volumetricWeightKg.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">计费重 (kg)</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.pricingSummary.chargeableWeightKg.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">头程计费重量 (kg)</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.firstLegPricing.billableWeightKg.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">头程单价 (元/kg)</span>
                  <span className="font-semibold text-gray-700">
                    {activeComputed.firstLegPricing.ratePerKg.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">头程费（整箱自动）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeComputed.firstLegPricing.firstLegCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">单件头程费（自动）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeComputed.perItemCostBreakdown.firstLegCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">SKU 单价（元/件）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeSku.unitPurchasePrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">采购成本（整箱自动）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeComputed.purchaseCostBoxCny)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">FBT履约费（USD/件）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeSku.costs.fbtFulfillmentFeeUsdPerItem)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">FBT履约费（单件人民币）</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeComputed.perItemCostBreakdown.fbtFulfillmentFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">单件总成本</span>
                  <span className="font-semibold text-gray-700">
                    {toCurrencyText(activeComputed.pricingSummary.totalCost)}
                  </span>
                </div>

                <div className="mt-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-600">建议标价（折前）</span>
                    <span className="text-xl font-black text-blue-600">
                      {toCurrencyText(activeComputed.pricingSummary.predictedSellingPrice)} 元
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">建议标价（美元）</span>
                    <span className="font-semibold text-blue-600">
                      {suggestedPriceUsd === null ? "--" : `$${suggestedPriceUsd.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">目标成交价（折后）</span>
                    <span className="font-semibold text-blue-600">
                      {toCurrencyText(activeComputed.pricingSummary.discountedSellingPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">目标成交价（美元）</span>
                    <span className="font-semibold text-blue-600">
                      {discountedPriceUsd === null ? "--" : `$${discountedPriceUsd.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">退货后有效收入</span>
                    <span className="font-semibold text-gray-700">
                      {toCurrencyText(activeComputed.pricingSummary.effectiveRevenueAfterReturns)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-gray-500">预计利润</span>
                    <span className="font-semibold text-emerald-600">
                      {toCurrencyText(activeComputed.pricingSummary.estimatedProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">按售价利润率</span>
                    <span className="font-semibold text-gray-700">
                      {toPercentText(activeComputed.pricingSummary.profitRateOnSalePrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">按成本加价率</span>
                    <span className="font-semibold text-gray-700">
                      {toPercentText(activeComputed.pricingSummary.markupOnCost)}
                    </span>
                  </div>
                </div>
              </div>

              {activeComputed.pricingSummary.predictedSellingPrice === null ? (
                <p className="mt-3 text-xs text-orange-600">
                  参数无效：按“售价利润率”时目标利率必须小于 100%，退货率必须小于 100%，折扣率必须大于 0%。
                </p>
              ) : null}

              <p className="mt-3 text-xs text-gray-400">
                头程费用已按渠道报价自动计算。空派限时达会根据目标海外仓分区与重量梯度计费。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default App;
