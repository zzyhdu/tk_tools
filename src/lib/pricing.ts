export type FirstLegChannel =
  | "fbt_us_express_sea_truck"
  | "fbt_us_standard_sea_truck"
  | "fbt_us_economy_sea_truck"
  | "fbt_air_express";

export type TargetRateMode = "margin_on_sale_price" | "markup_on_cost";

export type CostInputs = {
  purchaseCost: number;
  sourceToHomeExpressCost: number;
  domesticWarehouseExpressCost: number;
  firstLegCost: number;
  fbtFulfillmentFee: number;
};

export type PhysicalInputs = {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type PricingInputs = {
  firstLegChannel: FirstLegChannel;
  costs: CostInputs;
  physical: PhysicalInputs;
  targetRate: number;
  targetRateMode: TargetRateMode;
};

export type PricingSummary = {
  firstLegChannel: FirstLegChannel;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  totalCost: number;
  predictedSellingPrice: number | null;
  estimatedProfit: number | null;
  profitRateOnSalePrice: number | null;
  markupOnCost: number | null;
};

const toSafeNonNegative = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
};

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const calculateVolumetricWeightKg = (
  physical: Pick<PhysicalInputs, "lengthCm" | "widthCm" | "heightCm">,
): number => {
  const length = toSafeNonNegative(physical.lengthCm);
  const width = toSafeNonNegative(physical.widthCm);
  const height = toSafeNonNegative(physical.heightCm);

  return roundTo((length * width * height) / 6000, 3);
};

export const calculateChargeableWeightKg = (
  actualWeightKg: number,
  volumetricWeightKg: number,
): number => {
  const actual = toSafeNonNegative(actualWeightKg);
  const volumetric = toSafeNonNegative(volumetricWeightKg);
  return roundTo(Math.max(actual, volumetric), 3);
};

export const calculateTotalCost = (costs: CostInputs): number => {
  return roundTo(
    toSafeNonNegative(costs.purchaseCost) +
      toSafeNonNegative(costs.sourceToHomeExpressCost) +
      toSafeNonNegative(costs.domesticWarehouseExpressCost) +
      toSafeNonNegative(costs.firstLegCost) +
      toSafeNonNegative(costs.fbtFulfillmentFee),
    2,
  );
};

export const calculatePurchaseCostByUnit = (
  unitPrice: number,
  quantity: number,
): number => {
  const safeUnitPrice = toSafeNonNegative(unitPrice);
  const safeQuantity = toSafeNonNegative(quantity);
  return roundTo(safeUnitPrice * safeQuantity, 2);
};

export const calculatePerItemCostFromBoxCost = (
  boxLevelCost: number,
  quantity: number,
): number => {
  const safeBoxLevelCost = toSafeNonNegative(boxLevelCost);
  const safeQuantity = toSafeNonNegative(quantity);
  if (safeQuantity <= 0) {
    return 0;
  }

  return roundTo(safeBoxLevelCost / safeQuantity, 2);
};

export const calculateFulfillmentFeePerItemCny = (
  feeUsdPerItem: number,
  usdToCnyRate: number,
): number => {
  const safeUsdFee = toSafeNonNegative(feeUsdPerItem);
  const safeRate = toSafeNonNegative(usdToCnyRate);
  return roundTo(safeUsdFee * safeRate, 2);
};

export const calculateCnyToUsd = (
  amountCny: number | null,
  usdToCnyRate: number,
): number | null => {
  if (amountCny === null) {
    return null;
  }

  const safeAmountCny = toSafeNonNegative(amountCny);
  const safeRate = toSafeNonNegative(usdToCnyRate);
  if (safeRate <= 0) {
    return null;
  }

  return roundTo(safeAmountCny / safeRate, 2);
};

export const calculateFirstLegCostFromRate = (
  chargeableWeightKg: number,
  ratePerKg: number,
): number => {
  const safeWeight = toSafeNonNegative(chargeableWeightKg);
  const safeRate = toSafeNonNegative(ratePerKg);
  return roundTo(safeWeight * safeRate, 2);
};

export const calculateTargetSellingPrice = (
  totalCost: number,
  targetRate: number,
  targetRateMode: TargetRateMode,
): number | null => {
  const safeTotalCost = toSafeNonNegative(totalCost);
  if (!Number.isFinite(targetRate) || targetRate < 0) {
    return null;
  }

  if (targetRateMode === "margin_on_sale_price") {
    if (targetRate >= 1) {
      return null;
    }

    return roundTo(safeTotalCost / (1 - targetRate), 2);
  }

  return roundTo(safeTotalCost * (1 + targetRate), 2);
};

export const summarizePricing = (inputs: PricingInputs): PricingSummary => {
  const volumetricWeightKg = calculateVolumetricWeightKg(inputs.physical);
  const chargeableWeightKg = calculateChargeableWeightKg(
    inputs.physical.actualWeightKg,
    volumetricWeightKg,
  );
  const totalCost = calculateTotalCost(inputs.costs);
  const predictedSellingPrice = calculateTargetSellingPrice(
    totalCost,
    inputs.targetRate,
    inputs.targetRateMode,
  );

  if (predictedSellingPrice === null || predictedSellingPrice <= 0 || totalCost <= 0) {
    return {
      firstLegChannel: inputs.firstLegChannel,
      volumetricWeightKg,
      chargeableWeightKg,
      totalCost,
      predictedSellingPrice,
      estimatedProfit: null,
      profitRateOnSalePrice: null,
      markupOnCost: null,
    };
  }

  const estimatedProfit = roundTo(predictedSellingPrice - totalCost, 2);
  const profitRateOnSalePrice = estimatedProfit / predictedSellingPrice;
  const markupOnCost = estimatedProfit / totalCost;

  return {
    firstLegChannel: inputs.firstLegChannel,
    volumetricWeightKg,
    chargeableWeightKg,
    totalCost,
    predictedSellingPrice,
    estimatedProfit,
    profitRateOnSalePrice,
    markupOnCost,
  };
};
