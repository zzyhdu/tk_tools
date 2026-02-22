import { Check, Info, Plus, Trash2 } from "lucide-react";
import { toCurrencyText } from "../app/helpers";
import type { SkuConfig, SkuSnapshot } from "../app/types";

type SkuListSidebarProps = {
  skus: SkuConfig[];
  activeSkuId: string;
  skuSnapshots: SkuSnapshot[];
  onAddSku: () => void;
  onSelectSku: (id: string) => void;
  onRemoveSku: (id: string) => void;
};

const SkuListSidebar = ({
  skus,
  activeSkuId,
  skuSnapshots,
  onAddSku,
  onSelectSku,
  onRemoveSku,
}: SkuListSidebarProps) => (
  <aside className="space-y-4 lg:col-span-3">
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">SKU 列表</h2>
        <button
          type="button"
          onClick={onAddSku}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          新增
        </button>
      </div>

      <div className="space-y-2">
        {skuSnapshots.map((snapshot) => {
          const isActive = snapshot.id === activeSkuId;
          return (
            <div key={snapshot.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectSku(snapshot.id)}
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
                  onClick={() => onRemoveSku(snapshot.id)}
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
);

export default SkuListSidebar;
