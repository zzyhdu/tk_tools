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
  returnRate: number;
  discountRate: number;
};

export type PricingSummary = {
  firstLegChannel: FirstLegChannel;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  totalCost: number;
  predictedSellingPrice: number | null;
  discountedSellingPrice: number | null;
  effectiveRevenueAfterReturns: number | null;
  estimatedProfit: number | null;
  profitRateOnSalePrice: number | null;
  markupOnCost: number | null;
};

export type PricingAdjustmentInputs = {
  returnRate: number;
  discountRate: number;
};

type PricingTargets = {
  listPriceBeforeDiscount: number;
  discountedSellingPrice: number;
  effectiveRevenueAfterReturns: number;
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

const calculatePricingTargets = (
  totalCost: number,
  targetRate: number,
  targetRateMode: TargetRateMode,
  adjustments: PricingAdjustmentInputs,
): PricingTargets | null => {
  const safeTotalCost = toSafeNonNegative(totalCost);
  if (!Number.isFinite(targetRate) || targetRate < 0) {
    return null;
  }

  const safeReturnRate = toSafeNonNegative(adjustments.returnRate);
  const safeDiscountRate = toSafeNonNegative(adjustments.discountRate);
  if (!Number.isFinite(adjustments.returnRate) || !Number.isFinite(adjustments.discountRate)) {
    return null;
  }
  if (safeReturnRate >= 1 || safeDiscountRate <= 0) {
    return null;
  }

  let effectiveRevenueAfterReturns: number;
  if (targetRateMode === "margin_on_sale_price") {
    if (targetRate >= 1) {
      return null;
    }
    effectiveRevenueAfterReturns = safeTotalCost / (1 - targetRate);
  } else {
    effectiveRevenueAfterReturns = safeTotalCost * (1 + targetRate);
  }

  const discountedSellingPrice = effectiveRevenueAfterReturns / (1 - safeReturnRate);
  const listPriceBeforeDiscount = discountedSellingPrice / safeDiscountRate;
  return {
    listPriceBeforeDiscount,
    discountedSellingPrice,
    effectiveRevenueAfterReturns,
  };
};

export const calculateTargetSellingPrice = (
  totalCost: number,
  targetRate: number,
  targetRateMode: TargetRateMode,
  adjustments: PricingAdjustmentInputs,
): number | null => {
  const targets = calculatePricingTargets(totalCost, targetRate, targetRateMode, adjustments);
  if (targets === null) {
    return null;
  }

  return roundTo(targets.listPriceBeforeDiscount, 2);
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
    {
      returnRate: inputs.returnRate,
      discountRate: inputs.discountRate,
    },
  );
  const targets = calculatePricingTargets(totalCost, inputs.targetRate, inputs.targetRateMode, {
    returnRate: inputs.returnRate,
    discountRate: inputs.discountRate,
  });
  const discountedSellingPrice =
    targets === null ? null : roundTo(targets.discountedSellingPrice, 2);
  const effectiveRevenueAfterReturns =
    targets === null ? null : roundTo(targets.effectiveRevenueAfterReturns, 2);

  if (
    predictedSellingPrice === null ||
    predictedSellingPrice <= 0 ||
    totalCost <= 0 ||
    discountedSellingPrice === null ||
    discountedSellingPrice <= 0 ||
    effectiveRevenueAfterReturns === null ||
    effectiveRevenueAfterReturns <= 0
  ) {
    return {
      firstLegChannel: inputs.firstLegChannel,
      volumetricWeightKg,
      chargeableWeightKg,
      totalCost,
      predictedSellingPrice,
      discountedSellingPrice,
      effectiveRevenueAfterReturns,
      estimatedProfit: null,
      profitRateOnSalePrice: null,
      markupOnCost: null,
    };
  }

  const estimatedProfit = roundTo(effectiveRevenueAfterReturns - totalCost, 2);
  const profitRateOnSalePrice = estimatedProfit / effectiveRevenueAfterReturns;
  const markupOnCost = estimatedProfit / totalCost;

  return {
    firstLegChannel: inputs.firstLegChannel,
    volumetricWeightKg,
    chargeableWeightKg,
    totalCost,
    predictedSellingPrice,
    discountedSellingPrice,
    effectiveRevenueAfterReturns,
    estimatedProfit,
    profitRateOnSalePrice,
    markupOnCost,
  };
};
