import React, { useMemo, useState } from "react";
import {
  Box,
  ChevronRight,
  Info,
  LayoutGrid,
  Package,
  RotateCcw,
} from "lucide-react";
import {
  calculatePackingResults,
  getNormalizedPreviewDimensions,
  type PackingDims,
} from "./lib/packing";

type Unit = "cm" | "mm" | "in";

const App = () => {
  const [dims, setDims] = useState<PackingDims>({
    length: 10,
    width: 10,
    height: 10,
  });
  const [quantity, setQuantity] = useState(12);
  const [maxResults, setMaxResults] = useState(8);
  const [unit, setUnit] = useState<Unit>("cm");

  const results = useMemo(
    () => calculatePackingResults(dims, quantity, maxResults),
    [dims, quantity, maxResults],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-200">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">智能打包计算器</h1>
            <p className="text-sm font-medium text-gray-500">
              优化外箱尺寸，寻找最接近正方体的排列方案
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <LayoutGrid className="h-5 w-5 text-blue-500" />
                商品参数
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    单位
                  </label>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as Unit)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cm">厘米 (cm)</option>
                    <option value="mm">毫米 (mm)</option>
                    <option value="in">英寸 (in)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      长度
                    </label>
                    <input
                      type="number"
                      value={dims.length}
                      onChange={(event) =>
                        setDims({
                          ...dims,
                          length: Number.parseFloat(event.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      宽度
                    </label>
                    <input
                      type="number"
                      value={dims.width}
                      onChange={(event) =>
                        setDims({
                          ...dims,
                          width: Number.parseFloat(event.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      高度
                    </label>
                    <input
                      type="number"
                      value={dims.height}
                      onChange={(event) =>
                        setDims({
                          ...dims,
                          height: Number.parseFloat(event.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    打包数量 (PCS)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Number.parseInt(event.target.value, 10) || 0)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-lg font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                    显示方案数
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxResults}
                    onChange={(event) =>
                      setMaxResults(
                        Math.min(
                          50,
                          Math.max(
                            1,
                            Number.parseInt(event.target.value, 10) || 1,
                          ),
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-1 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-sm leading-relaxed text-blue-700">
                <strong>为什么推荐正方体？</strong>
                <br />
                接近正方体的纸箱在承受堆码压力时更稳固，且通常在相同体积下表面积最小，能节省包材成本。
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Box className="h-5 w-5 text-green-500" />
                  推荐排列方案
                </h2>
                <span className="text-xs font-medium text-gray-400">
                  已按方形度排序（最多 {maxResults} 条）
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {results.length > 0 ? (
                  results.map((item, index) => {
                    const preview = getNormalizedPreviewDimensions(item.dims, 44, 8);
                    const depthX = Math.max(6, Math.round(preview.width * 0.62));
                    const depthY = Math.max(4, Math.round(preview.width * 0.34));
                    const frontX = 12;
                    const bottomY = 60;
                    const frontY = bottomY - preview.height;
                    const frontRightX = frontX + preview.length;

                    const topFacePoints = [
                      `${frontX},${frontY}`,
                      `${frontRightX},${frontY}`,
                      `${frontRightX + depthX},${frontY - depthY}`,
                      `${frontX + depthX},${frontY - depthY}`,
                    ].join(" ");

                    const sideFacePoints = [
                      `${frontRightX},${frontY}`,
                      `${frontRightX},${bottomY}`,
                      `${frontRightX + depthX},${bottomY - depthY}`,
                      `${frontRightX + depthX},${frontY - depthY}`,
                    ].join(" ");

                    return (
                      <div
                        key={index}
                        className="group p-6 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-bold ${
                                  index === 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {index === 0 ? "最佳推荐" : `方案 ${index + 1}`}
                              </span>
                              <span className="text-lg font-bold text-gray-700">
                                {item.layout}{" "}
                                <span className="text-sm font-normal text-gray-400">
                                  (行列层)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-2xl font-black text-blue-600">
                              {item.dims.l} × {item.dims.w} × {item.dims.h}
                              <span className="ml-1 text-sm font-medium text-gray-400">
                                {unit}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs font-bold uppercase text-gray-400">
                                长宽比
                              </div>
                              <div
                                className={`text-sm font-bold ${
                                  Number.parseFloat(item.ratio) < 1.5
                                    ? "text-green-600"
                                    : "text-orange-500"
                                }`}
                              >
                                {item.ratio} : 1
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-blue-500" />
                          </div>
                        </div>

                        <div className="mt-4 flex items-end gap-3">
                          <svg
                            viewBox="0 0 120 70"
                            className="h-[58px] w-[108px] shrink-0"
                            aria-label="箱体比例示意图"
                          >
                            <polygon
                              points={topFacePoints}
                              fill={index === 0 ? "#bbf7d0" : "#e5e7eb"}
                              stroke={index === 0 ? "#22c55e" : "#9ca3af"}
                              strokeWidth="1.2"
                            />
                            <polygon
                              points={sideFacePoints}
                              fill={index === 0 ? "#86efac" : "#d1d5db"}
                              stroke={index === 0 ? "#22c55e" : "#9ca3af"}
                              strokeWidth="1.2"
                            />
                            <rect
                              x={frontX}
                              y={frontY}
                              width={preview.length}
                              height={preview.height}
                              fill={index === 0 ? "#dcfce7" : "#f3f4f6"}
                              stroke={index === 0 ? "#22c55e" : "#9ca3af"}
                              strokeWidth="1.2"
                            />
                          </svg>
                          <div className="text-xs text-gray-400">
                            <div className="font-medium text-gray-500">
                              按长宽高同比缩放
                            </div>
                            <div className="italic text-gray-300">
                              模拟外型比例
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-gray-400">
                    <RotateCcw className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p>请输入商品尺寸和数量以获取方案</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-400">
              * 建议在选择外箱时，在计算得出的净尺寸基础上增加 0.5cm - 1cm
              的余量，以便于放入和取出。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
