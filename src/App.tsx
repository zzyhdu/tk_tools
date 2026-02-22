import React, { useMemo, useState } from "react";
import { Box, Package } from "lucide-react";
import { parseLayoutSegments } from "./lib/packing";
import { calculateCnyToUsd } from "./lib/pricing";
import {
  defaultAirExpressRateTable,
  defaultEconomySeaRateTable,
  defaultExpressSeaRateTable,
  defaultFlatRatePerKgByChannel,
  defaultStandardSeaRateTable,
  originRegionLabels,
  type AirExpressRateTable,
  type ExpressSeaRateTable,
} from "./lib/firstLegPricing";
import {
  getWarehouseById,
  tiktokUsWarehouses,
  warehouseRegionLabels,
  type WarehouseRegion,
} from "./lib/usWarehouses";
import {
  AIR_ZONE_LABELS,
  FIRST_LEG_CHANNEL_OPTIONS,
  FIRST_LEG_TIER_LABELS,
  WAREHOUSE_REGION_ORDER,
  createDefaultSku,
} from "./app/constants";
import {
  clampNonNegative,
  clampPercent,
  expandResolvedLayers,
  getBoundaryRatiosByValues,
  getProjectedPreviewDimensions,
  getSkuComputed,
  resolveLayoutSegments,
  toCurrencyText,
} from "./app/helpers";
import type {
  ResolvedLayoutLayer,
  SkuConfig,
  SkuSnapshot,
} from "./app/types";
import PackingSection from "./components/PackingSection";
import ResultSummaryPanel from "./components/ResultSummaryPanel";
import SkuListSidebar from "./components/SkuListSidebar";

const App = () => {
  const [skus, setSkus] = useState<SkuConfig[]>([createDefaultSku(1)]);
  const [activeSkuId, setActiveSkuId] = useState("sku-1");
  const [nextSkuIndex, setNextSkuIndex] = useState(2);
  const flatRatePerKgByChannel = defaultFlatRatePerKgByChannel;
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

    return expandResolvedLayers(resolvedSegments);
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

  const skuSnapshots = useMemo<SkuSnapshot[]>(
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
          <SkuListSidebar
            skus={skus}
            activeSkuId={activeSku.id}
            skuSnapshots={skuSnapshots}
            onAddSku={addSku}
            onSelectSku={setActiveSkuId}
            onRemoveSku={removeSku}
          />

          <main className="space-y-6 lg:col-span-6">
            <PackingSection
              activeSku={activeSku}
              activeComputed={activeComputed}
              selectedLayoutLayers={selectedLayoutLayers}
              selectedLayerBoundaries={selectedLayerBoundaries}
              selectedPreview={selectedPreview}
              onPatchSku={patchActiveSku}
            />

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
                        firstLegChannel: event.target.value as SkuConfig["firstLegChannel"],
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
                        originRegion: event.target.value as SkuConfig["originRegion"],
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
                        actualWeightKg: clampNonNegative(Number.parseFloat(event.target.value) || 0),
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
                        targetRateMode: event.target.value as SkuConfig["targetRateMode"],
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

          <ResultSummaryPanel
            activeSku={activeSku}
            activeComputed={activeComputed}
            selectedChannelLabel={selectedChannel?.label}
            activeWarehouse={activeWarehouse}
            suggestedPriceUsd={suggestedPriceUsd}
            discountedPriceUsd={discountedPriceUsd}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
