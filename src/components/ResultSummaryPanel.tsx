import { AIR_ZONE_LABELS, FIRST_LEG_TIER_LABELS } from "../app/constants";
import { toCurrencyText, toPercentText } from "../app/helpers";
import type { SkuComputed, SkuConfig } from "../app/types";
import { originRegionLabels } from "../lib/firstLegPricing";
import { warehouseRegionLabels, type UsWarehouse } from "../lib/usWarehouses";

type ResultSummaryPanelProps = {
  activeSku: SkuConfig;
  activeComputed: SkuComputed;
  selectedChannelLabel?: string;
  activeWarehouse: UsWarehouse | null | undefined;
  suggestedPriceUsd: number | null;
  discountedPriceUsd: number | null;
};

const ResultSummaryPanel = ({
  activeSku,
  activeComputed,
  selectedChannelLabel,
  activeWarehouse,
  suggestedPriceUsd,
  discountedPriceUsd,
}: ResultSummaryPanelProps) => (
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
          <span className="text-right font-medium text-gray-700">{selectedChannelLabel ?? "--"}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-gray-500">目标仓库</span>
          <span className="text-right font-medium text-gray-700">
            {activeWarehouse ? `${activeWarehouse.name} [${activeWarehouse.code}]` : "--"}
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
          <span className="font-semibold text-gray-700">{toCurrencyText(activeSku.unitPurchasePrice)}</span>
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
);

export default ResultSummaryPanel;
