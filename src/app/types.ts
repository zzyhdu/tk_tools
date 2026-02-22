import type {
  AirExpressRateTable,
  ExpressSeaRateTable,
  FirstLegPricingResult,
  FlatRatePerKgByChannel,
  OriginRegion,
} from "../lib/firstLegPricing";
import type {
  PackingDims,
  PackingLayoutSegment,
  PackingResult,
} from "../lib/packing";
import type {
  CostInputs,
  FirstLegChannel,
  PricingSummary,
  TargetRateMode,
} from "../lib/pricing";
import type { SupportedUnit } from "../lib/skuWorkflow";

export type Unit = SupportedUnit;

export type SkuBaseCosts = {
  sourceToHomeExpressCost: number;
  domesticWarehouseExpressCost: number;
  fbtFulfillmentFeeUsdPerItem: number;
  usdToCnyRate: number;
};

export type SkuConfig = {
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

export type SkuComputed = {
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

export type ResolvedLayoutLayer = PackingLayoutSegment & {
  countAlongLength: number;
  countAlongWidth: number;
  nxAxis: "L" | "W";
  nyAxis: "L" | "W";
  layerHeight: number;
};

export type ResolvedLayoutSegment = PackingLayoutSegment & {
  countAlongLength: number;
  countAlongWidth: number;
  nxAxis: "L" | "W";
  nyAxis: "L" | "W";
  singleLayerHeight: number;
  segmentHeight: number;
};

export type SkuSnapshot = {
  id: string;
  name: string;
  layout: string;
  suggestedPrice: number | null;
};

export type FirstLegPricingConfig = {
  flatRatePerKgByChannel: FlatRatePerKgByChannel;
  airExpressRateTable: AirExpressRateTable;
  expressSeaRateTable: ExpressSeaRateTable;
  standardSeaRateTable: ExpressSeaRateTable;
  economySeaRateTable: ExpressSeaRateTable;
};
