import type { FirstLegChannel } from "../lib/pricing";
import type { WarehouseRegion } from "../lib/usWarehouses";
import type { SkuConfig } from "./types";

export const FIRST_LEG_CHANNEL_OPTIONS: Array<{
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

export const AIR_ZONE_LABELS = {
  west: "美西仓",
  central: "美中仓",
  east: "美东仓",
} as const;

export const FIRST_LEG_TIER_LABELS = {
  "12_20": "12-20KG",
  "21_100": "21-100KG",
  "101_plus": "101KG+",
  "12_plus": "12KG+",
  "51_plus": "51KG+",
  "100_plus": "100KG+",
  "500_plus": "500KG+",
  "1000_plus": "1000KG+",
} as const;

export const WAREHOUSE_REGION_ORDER: WarehouseRegion[] = ["west", "central", "east"];

export const createDefaultSku = (index: number): SkuConfig => ({
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
