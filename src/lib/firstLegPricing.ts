import {
  calculateFirstLegCostFromRate,
  type FirstLegChannel,
} from "./pricing";
import { getWarehouseById, getWarehouseRegionById } from "./usWarehouses";

export type AirExpressZone = "west" | "central" | "east";
export type AirExpressTier = "12_20" | "21_100" | "101_plus";
export type SeaExpressTier =
  | "12_plus"
  | "51_plus"
  | "100_plus"
  | "500_plus"
  | "1000_plus";
export type FirstLegTier = AirExpressTier | SeaExpressTier;

export type OriginRegion = "east_china" | "south_china" | "fujian";

export const originRegionLabels: Record<OriginRegion, string> = {
  east_china: "华东",
  south_china: "华南",
  fujian: "福建",
};

export type AirExpressRateRow = {
  tier12To20: number;
  tier21To100: number;
  tier101Plus: number;
};

export type AirExpressRateTable = Record<AirExpressZone, AirExpressRateRow>;

export type FlatRatePerKgByChannel = Record<FirstLegChannel, number>;

type SeaTierRates = Record<OriginRegion, number | null>;

type SeaWarehouseRateCard = {
  tier12Plus: SeaTierRates;
  tier51Plus: SeaTierRates;
  tier100Plus: SeaTierRates;
  tier500Plus: SeaTierRates;
  tier1000Plus: SeaTierRates;
  referenceTransitDays: number;
  claimTransitDays: number;
  deliveryMode: string;
};

export type ExpressSeaRateTable = Record<string, SeaWarehouseRateCard>;

export type FirstLegPricingResult = {
  firstLegCost: number;
  ratePerKg: number;
  billableWeightKg: number;
  zone: AirExpressZone | null;
  tier: FirstLegTier | null;
  details: string;
};

const toSafeNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export const defaultFlatRatePerKgByChannel: FlatRatePerKgByChannel = {
  fbt_us_express_sea_truck: 0,
  fbt_us_standard_sea_truck: 0,
  fbt_us_economy_sea_truck: 0,
  fbt_air_express: 0,
};

export const defaultAirExpressRateTable: AirExpressRateTable = {
  west: { tier12To20: 51, tier21To100: 50, tier101Plus: 49 },
  central: { tier12To20: 53, tier21To100: 52, tier101Plus: 51 },
  east: { tier12To20: 54, tier21To100: 53, tier101Plus: 52 },
};

const makeSeaTier = (
  eastChina: number | null,
  southChina: number | null,
  fujian: number | null,
): SeaTierRates => ({
  east_china: eastChina,
  south_china: southChina,
  fujian,
});

const makeSeaCard = (params: {
  tier12Plus: SeaTierRates;
  tier51Plus: SeaTierRates;
  tier100Plus: SeaTierRates;
  tier500Plus: SeaTierRates;
  tier1000Plus: SeaTierRates;
  referenceTransitDays: number;
  claimTransitDays: number;
  deliveryMode?: string;
}): SeaWarehouseRateCard => ({
  ...params,
  deliveryMode: params.deliveryMode ?? "卡车派送",
});

const westStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(11.6, 12.1, 12.1),
  tier51Plus: makeSeaTier(9.6, 10.1, 10.1),
  tier100Plus: makeSeaTier(9.6, 10.1, 10.1),
  tier500Plus: makeSeaTier(9.5, 10, 10),
  tier1000Plus: makeSeaTier(9.4, 9.9, 9.9),
  referenceTransitDays: 16,
  claimTransitDays: 17,
});

const westHubCard = makeSeaCard({
  tier12Plus: makeSeaTier(11.1, 11.6, 11.6),
  tier51Plus: makeSeaTier(9.1, 9.6, 9.6),
  tier100Plus: makeSeaTier(9.1, 9.6, 9.6),
  tier500Plus: makeSeaTier(9, 9.5, 9.5),
  tier1000Plus: makeSeaTier(8.9, 9.4, 9.4),
  referenceTransitDays: 16,
  claimTransitDays: 17,
});

const centralOrdCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(12.6, 13.1, 13.1),
  tier100Plus: makeSeaTier(12.6, 13.1, 13.1),
  tier500Plus: makeSeaTier(12.5, 13, 13),
  tier1000Plus: makeSeaTier(12.4, 12.9, 12.9),
  referenceTransitDays: 22,
  claimTransitDays: 23,
});

const centralHoustonCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(12.2, 12.7, 12.7),
  tier100Plus: makeSeaTier(12.2, 12.7, 12.7),
  tier500Plus: makeSeaTier(12.1, 12.6, 12.6),
  tier1000Plus: makeSeaTier(12, 12.5, 12.5),
  referenceTransitDays: 22,
  claimTransitDays: 23,
});

const eastAtlantaCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(12.6, 13.1, 13.1),
  tier100Plus: makeSeaTier(12.6, 13.1, 13.1),
  tier500Plus: makeSeaTier(12.5, 13, 13),
  tier1000Plus: makeSeaTier(12.4, 12.9, 12.9),
  referenceTransitDays: 24,
  claimTransitDays: 25,
});

const eastEwrCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(13.7, 14.2, 14.2),
  tier100Plus: makeSeaTier(13.7, 14.2, 14.2),
  tier500Plus: makeSeaTier(13.6, 14.1, 14.1),
  tier1000Plus: makeSeaTier(13.5, 14, 14),
  referenceTransitDays: 25,
  claimTransitDays: 26,
});

export const defaultExpressSeaRateTable: ExpressSeaRateTable = {
  FC11_ONT5: westStandardCard,
  FC01_ONT2: westStandardCard,
  FC07_ONT3: westStandardCard,
  FC08_ONT4: westStandardCard,
  XD03_ONT6: westStandardCard,
  XD01_ONT1: westHubCard,
  FC10_ORD2: centralOrdCard,
  FC02_ORD1: centralOrdCard,
  FC12_HOU3: centralHoustonCard,
  FC06_HOU2: centralHoustonCard,
  FC05_HOU1: centralHoustonCard,
  FC09_ATL2: eastAtlantaCard,
  FC03_ATL1: eastAtlantaCard,
  FC13_EWR3: eastEwrCard,
  FC14_EWR4: eastEwrCard,
  XD02_EWR1: eastEwrCard,
  FC04_EWR2: eastEwrCard,
};

const westStandardStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(8.6, 8.7, 9.1),
  tier51Plus: makeSeaTier(6.6, 6.7, 7.1),
  tier100Plus: makeSeaTier(6.6, 6.7, 7.1),
  tier500Plus: makeSeaTier(6.5, 6.6, 7),
  tier1000Plus: makeSeaTier(6.4, 6.5, 6.9),
  referenceTransitDays: 19,
  claimTransitDays: 25,
});

const westHubStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(8.1, 8.2, 8.6),
  tier51Plus: makeSeaTier(6.1, 6.2, 6.6),
  tier100Plus: makeSeaTier(6.1, 6.2, 6.6),
  tier500Plus: makeSeaTier(6, 6.1, 6.5),
  tier1000Plus: makeSeaTier(5.9, 6, 6.4),
  referenceTransitDays: 19,
  claimTransitDays: 25,
});

const centralOrdStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(9.6, 9.7, 10.1),
  tier100Plus: makeSeaTier(9.6, 9.7, 10.1),
  tier500Plus: makeSeaTier(9.5, 9.6, 10),
  tier1000Plus: makeSeaTier(9.4, 9.5, 9.9),
  referenceTransitDays: 25,
  claimTransitDays: 30,
});

const centralHoustonStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(9.2, 9.3, 9.7),
  tier100Plus: makeSeaTier(9.2, 9.3, 9.7),
  tier500Plus: makeSeaTier(9.1, 9.2, 9.6),
  tier1000Plus: makeSeaTier(9, 9.1, 9.5),
  referenceTransitDays: 25,
  claimTransitDays: 30,
});

const eastAtlantaStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(9.6, 9.7, 10.1),
  tier100Plus: makeSeaTier(9.6, 9.7, 10.1),
  tier500Plus: makeSeaTier(9.5, 9.6, 10),
  tier1000Plus: makeSeaTier(9.4, 9.5, 9.9),
  referenceTransitDays: 27,
  claimTransitDays: 32,
});

const eastEwrStandardCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(10.7, 10.8, 11.2),
  tier100Plus: makeSeaTier(10.7, 10.8, 11.2),
  tier500Plus: makeSeaTier(10.6, 10.7, 11.1),
  tier1000Plus: makeSeaTier(10.5, 10.6, 11),
  referenceTransitDays: 28,
  claimTransitDays: 33,
});

export const defaultStandardSeaRateTable: ExpressSeaRateTable = {
  FC11_ONT5: westStandardStandardCard,
  FC01_ONT2: westStandardStandardCard,
  FC07_ONT3: westStandardStandardCard,
  FC08_ONT4: westStandardStandardCard,
  XD03_ONT6: westStandardStandardCard,
  XD01_ONT1: westHubStandardCard,
  FC10_ORD2: centralOrdStandardCard,
  FC02_ORD1: centralOrdStandardCard,
  FC12_HOU3: centralHoustonStandardCard,
  FC06_HOU2: centralHoustonStandardCard,
  FC05_HOU1: centralHoustonStandardCard,
  FC09_ATL2: eastAtlantaStandardCard,
  FC03_ATL1: eastAtlantaStandardCard,
  FC13_EWR3: eastEwrStandardCard,
  FC14_EWR4: eastEwrStandardCard,
  XD02_EWR1: eastEwrStandardCard,
  FC04_EWR2: eastEwrStandardCard,
};

const westEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(6.3, 6.3, 6.4),
  tier51Plus: makeSeaTier(4.3, 4.3, 4.4),
  tier100Plus: makeSeaTier(4.3, 4.3, 4.4),
  tier500Plus: makeSeaTier(4.2, 4.2, 4.3),
  tier1000Plus: makeSeaTier(4.1, 4.1, 4.2),
  referenceTransitDays: 25,
  claimTransitDays: 34,
});

const westHubEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(5.8, 5.8, 5.9),
  tier51Plus: makeSeaTier(3.8, 3.8, 3.9),
  tier100Plus: makeSeaTier(3.8, 3.8, 3.9),
  tier500Plus: makeSeaTier(3.7, 3.7, 3.8),
  tier1000Plus: makeSeaTier(3.6, 3.6, 3.7),
  referenceTransitDays: 25,
  claimTransitDays: 34,
});

const centralOrdEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(7.3, 7.3, 7.4),
  tier100Plus: makeSeaTier(7.3, 7.3, 7.4),
  tier500Plus: makeSeaTier(7.2, 7.2, 7.3),
  tier1000Plus: makeSeaTier(7.1, 7.1, 7.2),
  referenceTransitDays: 29,
  claimTransitDays: 37,
});

const centralHoustonEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(6.9, 6.9, 7),
  tier100Plus: makeSeaTier(6.9, 6.9, 7),
  tier500Plus: makeSeaTier(6.8, 6.8, 6.9),
  tier1000Plus: makeSeaTier(6.7, 6.7, 6.8),
  referenceTransitDays: 29,
  claimTransitDays: 37,
});

const eastAtlantaEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(7.3, 7.3, 7.4),
  tier100Plus: makeSeaTier(7.3, 7.3, 7.4),
  tier500Plus: makeSeaTier(7.2, 7.2, 7.3),
  tier1000Plus: makeSeaTier(7.1, 7.1, 7.2),
  referenceTransitDays: 33,
  claimTransitDays: 39,
});

const eastEwrEconomyCard = makeSeaCard({
  tier12Plus: makeSeaTier(null, null, null),
  tier51Plus: makeSeaTier(8.4, 8.4, 8.5),
  tier100Plus: makeSeaTier(8.4, 8.4, 8.5),
  tier500Plus: makeSeaTier(8.3, 8.3, 8.4),
  tier1000Plus: makeSeaTier(8.2, 8.2, 8.3),
  referenceTransitDays: 33,
  claimTransitDays: 39,
});

export const defaultEconomySeaRateTable: ExpressSeaRateTable = {
  FC11_ONT5: westEconomyCard,
  FC01_ONT2: westEconomyCard,
  FC07_ONT3: westEconomyCard,
  FC08_ONT4: westEconomyCard,
  XD03_ONT6: westEconomyCard,
  XD01_ONT1: westHubEconomyCard,
  FC10_ORD2: centralOrdEconomyCard,
  FC02_ORD1: centralOrdEconomyCard,
  FC12_HOU3: centralHoustonEconomyCard,
  FC06_HOU2: centralHoustonEconomyCard,
  FC05_HOU1: centralHoustonEconomyCard,
  FC09_ATL2: eastAtlantaEconomyCard,
  FC03_ATL1: eastAtlantaEconomyCard,
  FC13_EWR3: eastEwrEconomyCard,
  FC14_EWR4: eastEwrEconomyCard,
  XD02_EWR1: eastEwrEconomyCard,
  FC04_EWR2: eastEwrEconomyCard,
};

export const detectAirExpressZoneByWarehouseId = (
  warehouseId: string,
): AirExpressZone | null => {
  if (!warehouseId) {
    return null;
  }

  return getWarehouseRegionById(warehouseId);
};

export const pickAirExpressTier = (billableWeightKg: number): AirExpressTier => {
  if (billableWeightKg <= 20) {
    return "12_20";
  }

  if (billableWeightKg <= 100) {
    return "21_100";
  }

  return "101_plus";
};

const getAirExpressRate = (
  table: AirExpressRateTable,
  zone: AirExpressZone,
  tier: AirExpressTier,
): number => {
  const row = table[zone];
  if (tier === "12_20") {
    return toSafeNonNegative(row.tier12To20);
  }

  if (tier === "21_100") {
    return toSafeNonNegative(row.tier21To100);
  }

  return toSafeNonNegative(row.tier101Plus);
};

const EXPRESS_SEA_TIERS_DESC: Array<{
  tier: SeaExpressTier;
  minWeight: number;
  key: keyof Pick<
    SeaWarehouseRateCard,
    "tier12Plus" | "tier51Plus" | "tier100Plus" | "tier500Plus" | "tier1000Plus"
  >;
}> = [
  { tier: "1000_plus", minWeight: 1000, key: "tier1000Plus" },
  { tier: "500_plus", minWeight: 500, key: "tier500Plus" },
  { tier: "100_plus", minWeight: 100, key: "tier100Plus" },
  { tier: "51_plus", minWeight: 51, key: "tier51Plus" },
  { tier: "12_plus", minWeight: 12, key: "tier12Plus" },
];

const pickExpressSeaTierRate = (
  card: SeaWarehouseRateCard,
  billableWeightKg: number,
  originRegion: OriginRegion,
): { tier: SeaExpressTier; ratePerKg: number } | null => {
  for (const config of EXPRESS_SEA_TIERS_DESC) {
    if (billableWeightKg < config.minWeight) {
      continue;
    }

    const candidateRate = card[config.key][originRegion];
    if (candidateRate === null) {
      continue;
    }

    const safeRate = toSafeNonNegative(candidateRate);
    if (safeRate <= 0) {
      continue;
    }

    return {
      tier: config.tier,
      ratePerKg: safeRate,
    };
  }

  return null;
};

export const calculateFirstLegByChannel = (params: {
  channel: FirstLegChannel;
  chargeableWeightKg: number;
  originRegion: OriginRegion;
  flatRatePerKgByChannel: FlatRatePerKgByChannel;
  airExpressRateTable: AirExpressRateTable;
  destinationWarehouseId: string;
  expressSeaRateTable?: ExpressSeaRateTable;
  standardSeaRateTable?: ExpressSeaRateTable;
  economySeaRateTable?: ExpressSeaRateTable;
}): FirstLegPricingResult => {
  const chargeableWeight = toSafeNonNegative(params.chargeableWeightKg);
  const billableWeight = Math.max(12, chargeableWeight);

  if (params.channel === "fbt_air_express") {
    const zone = detectAirExpressZoneByWarehouseId(params.destinationWarehouseId);
    if (!zone) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: null,
        tier: pickAirExpressTier(billableWeight),
        details: "缺少有效海外仓，无法确定空派分区",
      };
    }

    const tier = pickAirExpressTier(billableWeight);
    const ratePerKg = getAirExpressRate(params.airExpressRateTable, zone, tier);
    const firstLegCost = calculateFirstLegCostFromRate(billableWeight, ratePerKg);

    return {
      firstLegCost,
      ratePerKg,
      billableWeightKg: billableWeight,
      zone,
      tier,
      details: "按空派仓库分区+重量梯度计费",
    };
  }

  if (params.channel === "fbt_us_express_sea_truck") {
    const warehouse = getWarehouseById(params.destinationWarehouseId);
    if (!warehouse) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: null,
        tier: null,
        details: "缺少有效海外仓，无法计算特快海卡费用",
      };
    }

    const rateTable = params.expressSeaRateTable ?? defaultExpressSeaRateTable;
    const rateCard = rateTable[warehouse.code];
    if (!rateCard) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `仓库 ${warehouse.code} 暂无特快海卡报价`,
      };
    }

    const tierRate = pickExpressSeaTierRate(rateCard, billableWeight, params.originRegion);
    if (!tierRate) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `${warehouse.code} 在${originRegionLabels[params.originRegion]}方向 ${billableWeight.toFixed(
          3,
        )}kg 无可用报价`,
      };
    }

    const firstLegCost = calculateFirstLegCostFromRate(
      billableWeight,
      tierRate.ratePerKg,
    );

    return {
      firstLegCost,
      ratePerKg: tierRate.ratePerKg,
      billableWeightKg: billableWeight,
      zone: warehouse.region,
      tier: tierRate.tier,
      details: `按特快海卡仓库报价计费（${warehouse.code}，${
        originRegionLabels[params.originRegion]
      }，参考${rateCard.referenceTransitDays}天）`,
    };
  }

  if (params.channel === "fbt_us_standard_sea_truck") {
    const warehouse = getWarehouseById(params.destinationWarehouseId);
    if (!warehouse) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: null,
        tier: null,
        details: "缺少有效海外仓，无法计算标快海卡费用",
      };
    }

    const rateTable = params.standardSeaRateTable ?? defaultStandardSeaRateTable;
    const rateCard = rateTable[warehouse.code];
    if (!rateCard) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `仓库 ${warehouse.code} 暂无标快海卡报价`,
      };
    }

    const tierRate = pickExpressSeaTierRate(rateCard, billableWeight, params.originRegion);
    if (!tierRate) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `${warehouse.code} 在${originRegionLabels[params.originRegion]}方向 ${billableWeight.toFixed(
          3,
        )}kg 无可用报价`,
      };
    }

    const firstLegCost = calculateFirstLegCostFromRate(
      billableWeight,
      tierRate.ratePerKg,
    );

    return {
      firstLegCost,
      ratePerKg: tierRate.ratePerKg,
      billableWeightKg: billableWeight,
      zone: warehouse.region,
      tier: tierRate.tier,
      details: `按标快海卡仓库报价计费（${warehouse.code}，${
        originRegionLabels[params.originRegion]
      }，参考${rateCard.referenceTransitDays}天）`,
    };
  }

  if (params.channel === "fbt_us_economy_sea_truck") {
    const warehouse = getWarehouseById(params.destinationWarehouseId);
    if (!warehouse) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: null,
        tier: null,
        details: "缺少有效海外仓，无法计算经济海卡费用",
      };
    }

    const rateTable = params.economySeaRateTable ?? defaultEconomySeaRateTable;
    const rateCard = rateTable[warehouse.code];
    if (!rateCard) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `仓库 ${warehouse.code} 暂无经济海卡报价`,
      };
    }

    const tierRate = pickExpressSeaTierRate(rateCard, billableWeight, params.originRegion);
    if (!tierRate) {
      return {
        firstLegCost: 0,
        ratePerKg: 0,
        billableWeightKg: billableWeight,
        zone: warehouse.region,
        tier: null,
        details: `${warehouse.code} 在${originRegionLabels[params.originRegion]}方向 ${billableWeight.toFixed(
          3,
        )}kg 无可用报价`,
      };
    }

    const firstLegCost = calculateFirstLegCostFromRate(
      billableWeight,
      tierRate.ratePerKg,
    );

    return {
      firstLegCost,
      ratePerKg: tierRate.ratePerKg,
      billableWeightKg: billableWeight,
      zone: warehouse.region,
      tier: tierRate.tier,
      details: `按经济海卡仓库报价计费（${warehouse.code}，${
        originRegionLabels[params.originRegion]
      }，参考${rateCard.referenceTransitDays}天）`,
    };
  }

  const ratePerKg = toSafeNonNegative(params.flatRatePerKgByChannel[params.channel]);
  const firstLegCost = calculateFirstLegCostFromRate(chargeableWeight, ratePerKg);

  return {
    firstLegCost,
    ratePerKg,
    billableWeightKg: chargeableWeight,
    zone: null,
    tier: null,
    details: "按统一单价计费",
  };
};
