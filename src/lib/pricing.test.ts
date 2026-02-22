import { describe, expect, it } from "vitest";
import {
  calculateChargeableWeightKg,
  calculateCnyToUsd,
  calculateFirstLegCostFromRate,
  calculateFulfillmentFeePerItemCny,
  calculatePerItemCostFromBoxCost,
  calculatePurchaseCostByUnit,
  calculateTargetSellingPrice,
  calculateTotalCost,
  calculateVolumetricWeightKg,
  summarizePricing,
} from "./pricing";

describe("calculateVolumetricWeightKg", () => {
  it("uses length*width*height/6000 for volumetric weight", () => {
    const result = calculateVolumetricWeightKg({
      lengthCm: 60,
      widthCm: 40,
      heightCm: 30,
    });

    expect(result).toBe(12);
  });
});

describe("calculateChargeableWeightKg", () => {
  it("returns the larger value between actual and volumetric weight", () => {
    const chargeable = calculateChargeableWeightKg(8, 12);
    expect(chargeable).toBe(12);
  });
});

describe("calculateTotalCost", () => {
  it("adds all configured cost segments", () => {
    const total = calculateTotalCost({
      purchaseCost: 20,
      sourceToHomeExpressCost: 1.5,
      domesticWarehouseExpressCost: 2.5,
      firstLegCost: 3,
      fbtFulfillmentFee: 4,
    });

    expect(total).toBe(31);
  });
});

describe("calculatePurchaseCostByUnit", () => {
  it("calculates purchase cost from unit price and quantity", () => {
    const purchaseCost = calculatePurchaseCostByUnit(3.25, 12);
    expect(purchaseCost).toBe(39);
  });

  it("returns 0 for invalid input", () => {
    const purchaseCost = calculatePurchaseCostByUnit(-1, Number.NaN);
    expect(purchaseCost).toBe(0);
  });
});

describe("calculatePerItemCostFromBoxCost", () => {
  it("splits box-level cost by quantity to unit-level cost", () => {
    const perItemCost = calculatePerItemCostFromBoxCost(48, 12);
    expect(perItemCost).toBe(4);
  });

  it("returns 0 for invalid quantity", () => {
    const perItemCost = calculatePerItemCostFromBoxCost(48, 0);
    expect(perItemCost).toBe(0);
  });
});

describe("calculateFulfillmentFeePerItemCny", () => {
  it("converts per-item fulfillment fee from usd to cny", () => {
    const perItemFeeCny = calculateFulfillmentFeePerItemCny(1.5, 7.2);
    expect(perItemFeeCny).toBe(10.8);
  });

  it("returns 0 for invalid input", () => {
    const perItemFeeCny = calculateFulfillmentFeePerItemCny(-1, Number.NaN);
    expect(perItemFeeCny).toBe(0);
  });
});

describe("calculateCnyToUsd", () => {
  it("converts cny amount to usd by usd-to-cny rate", () => {
    const amountUsd = calculateCnyToUsd(72, 7.2);
    expect(amountUsd).toBe(10);
  });

  it("returns null for invalid exchange rate", () => {
    const amountUsd = calculateCnyToUsd(72, 0);
    expect(amountUsd).toBeNull();
  });
});

describe("calculateFirstLegCostFromRate", () => {
  it("calculates first-leg cost by chargeable weight and rate", () => {
    const firstLegCost = calculateFirstLegCostFromRate(12.345, 8.8);
    expect(firstLegCost).toBe(108.64);
  });

  it("returns 0 when inputs are invalid", () => {
    const firstLegCost = calculateFirstLegCostFromRate(-1, Number.NaN);
    expect(firstLegCost).toBe(0);
  });
});

describe("calculateTargetSellingPrice", () => {
  it("supports margin rate based on selling price", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "margin_on_sale_price", {
      returnRate: 0,
      discountRate: 1,
    });
    expect(price).toBe(100);
  });

  it("supports markup rate based on cost", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "markup_on_cost", {
      returnRate: 0,
      discountRate: 1,
    });
    expect(price).toBe(91);
  });

  it("raises required price when return rate is applied", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "margin_on_sale_price", {
      returnRate: 0.1,
      discountRate: 1,
    });
    expect(price).toBe(111.11);
  });

  it("raises required list price when discount is applied", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "margin_on_sale_price", {
      returnRate: 0.1,
      discountRate: 0.8,
    });
    expect(price).toBe(138.89);
  });

  it("returns null when sale-based margin is 100% or above", () => {
    const price = calculateTargetSellingPrice(70, 1, "margin_on_sale_price", {
      returnRate: 0,
      discountRate: 1,
    });
    expect(price).toBeNull();
  });

  it("returns null when return rate is 100% or above", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "margin_on_sale_price", {
      returnRate: 1,
      discountRate: 1,
    });
    expect(price).toBeNull();
  });

  it("returns null when discount rate is zero or below", () => {
    const price = calculateTargetSellingPrice(70, 0.3, "margin_on_sale_price", {
      returnRate: 0.1,
      discountRate: 0,
    });
    expect(price).toBeNull();
  });
});

describe("summarizePricing", () => {
  it("returns a full pricing summary", () => {
    const summary = summarizePricing({
      firstLegChannel: "fbt_us_standard_sea_truck",
      costs: {
        purchaseCost: 20,
        sourceToHomeExpressCost: 2,
        domesticWarehouseExpressCost: 3,
        firstLegCost: 4,
        fbtFulfillmentFee: 1,
      },
      physical: {
        actualWeightKg: 1.8,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
      },
      targetRate: 0.25,
      targetRateMode: "margin_on_sale_price",
      returnRate: 0.1,
      discountRate: 0.8,
    });

    expect(summary.totalCost).toBe(30);
    expect(summary.volumetricWeightKg).toBe(4);
    expect(summary.chargeableWeightKg).toBe(4);
    expect(summary.predictedSellingPrice).toBe(55.56);
    expect(summary.discountedSellingPrice).toBe(44.44);
    expect(summary.effectiveRevenueAfterReturns).toBe(40);
    expect(summary.estimatedProfit).toBe(10);
    expect(summary.profitRateOnSalePrice).toBe(0.25);
    expect(summary.markupOnCost).toBeCloseTo(0.333333, 5);
  });
});
