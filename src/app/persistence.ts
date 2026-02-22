import type {
  FirstLegChannel,
  TargetRateMode,
} from "../lib/pricing";
import type { OriginRegion } from "../lib/firstLegPricing";
import { createDefaultSku } from "./constants";
import type { SkuConfig, Unit } from "./types";

const APP_STORAGE_KEY = "tk_tools_app_state_v1";
const APP_STORAGE_VERSION = 1;

type PersistedPayload = {
  version: number;
  skus: SkuConfig[];
  activeSkuId: string;
  nextSkuIndex: number;
  updatedAt: string;
};

export type PersistedAppState = {
  skus: SkuConfig[];
  activeSkuId: string;
  nextSkuIndex: number;
  updatedAt: string;
};

const VALID_UNITS = new Set<Unit>(["cm", "mm", "in"]);
const VALID_ORIGIN_REGIONS = new Set<OriginRegion>(["east_china", "south_china", "fujian"]);
const VALID_FIRST_LEG_CHANNELS = new Set<FirstLegChannel>([
  "fbt_us_express_sea_truck",
  "fbt_us_standard_sea_truck",
  "fbt_us_economy_sea_truck",
  "fbt_air_express",
]);
const VALID_TARGET_RATE_MODES = new Set<TargetRateMode>([
  "margin_on_sale_price",
  "markup_on_cost",
]);

const getDefaultState = (): PersistedAppState => ({
  skus: [createDefaultSku(1)],
  activeSkuId: "sku-1",
  nextSkuIndex: 2,
  updatedAt: new Date().toISOString(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNonNegative = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value >= 0 ? value : fallback;
};

const toBoundedPercent = (value: unknown, fallback: number): number => {
  const safe = toNonNegative(value, fallback);
  return Math.min(safe, 100);
};

const toIntWithBounds = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
};

const normalizeSku = (raw: unknown, index: number): SkuConfig => {
  const defaults = createDefaultSku(index);
  if (!isRecord(raw)) {
    return defaults;
  }

  const rawCosts = isRecord(raw.costs) ? raw.costs : {};
  const rawDims = isRecord(raw.dims) ? raw.dims : {};
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : defaults.id;

  return {
    id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : defaults.name,
    unit:
      typeof raw.unit === "string" && VALID_UNITS.has(raw.unit as Unit)
        ? (raw.unit as Unit)
        : defaults.unit,
    dims: {
      length: toNonNegative(rawDims.length, defaults.dims.length),
      width: toNonNegative(rawDims.width, defaults.dims.width),
      height: toNonNegative(rawDims.height, defaults.dims.height),
    },
    quantity: toIntWithBounds(raw.quantity, defaults.quantity, 1, Number.MAX_SAFE_INTEGER),
    unitPurchasePrice: toNonNegative(raw.unitPurchasePrice, defaults.unitPurchasePrice),
    maxResults: toIntWithBounds(raw.maxResults, defaults.maxResults, 1, 12),
    selectedPackingIndex: toIntWithBounds(raw.selectedPackingIndex, defaults.selectedPackingIndex, 0, 999),
    actualWeightKg: toNonNegative(raw.actualWeightKg, defaults.actualWeightKg),
    destinationWarehouseId:
      typeof raw.destinationWarehouseId === "string" && raw.destinationWarehouseId.trim()
        ? raw.destinationWarehouseId
        : defaults.destinationWarehouseId,
    originRegion:
      typeof raw.originRegion === "string" && VALID_ORIGIN_REGIONS.has(raw.originRegion as OriginRegion)
        ? (raw.originRegion as OriginRegion)
        : defaults.originRegion,
    firstLegChannel:
      typeof raw.firstLegChannel === "string" &&
      VALID_FIRST_LEG_CHANNELS.has(raw.firstLegChannel as FirstLegChannel)
        ? (raw.firstLegChannel as FirstLegChannel)
        : defaults.firstLegChannel,
    targetRateMode:
      typeof raw.targetRateMode === "string" &&
      VALID_TARGET_RATE_MODES.has(raw.targetRateMode as TargetRateMode)
        ? (raw.targetRateMode as TargetRateMode)
        : defaults.targetRateMode,
    targetRatePercent: toNonNegative(raw.targetRatePercent, defaults.targetRatePercent),
    returnRatePercent: toBoundedPercent(raw.returnRatePercent, defaults.returnRatePercent),
    discountRatePercent: toBoundedPercent(raw.discountRatePercent, defaults.discountRatePercent),
    costs: {
      sourceToHomeExpressCost: toNonNegative(
        rawCosts.sourceToHomeExpressCost,
        defaults.costs.sourceToHomeExpressCost,
      ),
      domesticWarehouseExpressCost: toNonNegative(
        rawCosts.domesticWarehouseExpressCost,
        defaults.costs.domesticWarehouseExpressCost,
      ),
      fbtFulfillmentFeeUsdPerItem: toNonNegative(
        rawCosts.fbtFulfillmentFeeUsdPerItem,
        defaults.costs.fbtFulfillmentFeeUsdPerItem,
      ),
      usdToCnyRate: toNonNegative(rawCosts.usdToCnyRate, defaults.costs.usdToCnyRate),
    },
  };
};

const extractSkuIndex = (id: string): number => {
  const match = /^sku-(\d+)$/.exec(id);
  if (!match) {
    return 0;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const ensureUniqueSkuIds = (skus: SkuConfig[]): SkuConfig[] => {
  const used = new Set<string>();
  return skus.map((sku, index) => {
    if (!used.has(sku.id)) {
      used.add(sku.id);
      return sku;
    }

    let candidate = `sku-${index + 1}`;
    while (used.has(candidate)) {
      candidate = `${candidate}-copy`;
    }
    used.add(candidate);
    return { ...sku, id: candidate };
  });
};

const hasBrowserStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeUpdatedAt = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const ts = Date.parse(value);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : fallback;
};

export const normalizePersistedAppState = (
  raw: unknown,
  fallback: PersistedAppState = getDefaultState(),
): PersistedAppState | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const rawSkus = Array.isArray(raw.skus) ? raw.skus : [];
  if (rawSkus.length === 0) {
    return null;
  }

  const normalizedSkus = ensureUniqueSkuIds(
    rawSkus.map((sku, index) => normalizeSku(sku, index + 1)),
  );
  if (normalizedSkus.length === 0) {
    return null;
  }

  const skuIds = new Set(normalizedSkus.map((sku) => sku.id));
  const activeSkuId =
    typeof raw.activeSkuId === "string" && skuIds.has(raw.activeSkuId)
      ? raw.activeSkuId
      : normalizedSkus[0].id;
  const persistedNext =
    typeof raw.nextSkuIndex === "number" && Number.isFinite(raw.nextSkuIndex)
      ? Math.max(1, Math.floor(raw.nextSkuIndex))
      : 1;
  const maxSkuIndex = normalizedSkus.reduce(
    (max, sku) => Math.max(max, extractSkuIndex(sku.id)),
    0,
  );
  const updatedAt = normalizeUpdatedAt(raw.updatedAt, fallback.updatedAt);

  return {
    skus: normalizedSkus,
    activeSkuId,
    nextSkuIndex: Math.max(persistedNext, maxSkuIndex + 1, normalizedSkus.length + 1, 2),
    updatedAt,
  };
};

export const loadPersistedAppState = (): PersistedAppState => {
  const defaults = getDefaultState();
  if (!hasBrowserStorage()) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return defaults;
    }
    const normalized = normalizePersistedAppState(parsed, defaults);
    return normalized ?? defaults;
  } catch {
    return defaults;
  }
};

export const savePersistedAppState = (state: PersistedAppState): void => {
  if (!hasBrowserStorage()) {
    return;
  }

  const payload: PersistedPayload = {
    version: APP_STORAGE_VERSION,
    skus: state.skus,
    activeSkuId: state.activeSkuId,
    nextSkuIndex: state.nextSkuIndex,
    updatedAt: normalizeUpdatedAt(state.updatedAt, new Date().toISOString()),
  };

  try {
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota/security errors and keep app state in memory.
  }
};
