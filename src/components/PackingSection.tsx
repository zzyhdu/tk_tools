import { ChevronRight, LayoutGrid, RotateCcw } from "lucide-react";
import {
  getNormalizedLayerGridPreview,
  parseLayoutSegments,
} from "../lib/packing";
import {
  clampNonNegative,
  getBoundaryRatiosByValues,
  getGridDividerRatios,
  getLayerLabel,
  getProjectedPreviewDimensions,
  resolveLayoutSegments,
  toDimensionText,
  type ProjectedPreviewDimensions,
} from "../app/helpers";
import type {
  ResolvedLayoutLayer,
  SkuComputed,
  SkuConfig,
  Unit,
} from "../app/types";

type PackingSectionProps = {
  activeSku: SkuConfig;
  activeComputed: SkuComputed;
  selectedLayoutLayers: ResolvedLayoutLayer[];
  selectedLayerBoundaries: number[];
  selectedPreview: ProjectedPreviewDimensions | null;
  onPatchSku: (updater: (sku: SkuConfig) => SkuConfig) => void;
};

const PackingSection = ({
  activeSku,
  activeComputed,
  selectedLayoutLayers,
  selectedLayerBoundaries,
  selectedPreview,
  onPatchSku,
}: PackingSectionProps) => {
  const selectedPackingResult = activeComputed.selectedResult;
  const selectedPreviewFrontX = 26;
  const selectedPreviewFrontWidth = selectedPreview?.length ?? 0;
  const selectedPreviewFrontHeight = selectedPreview?.height ?? 0;
  const selectedPreviewFrontY = 142 - selectedPreviewFrontHeight;
  const selectedPreviewDepthX = selectedPreview?.depthX ?? 0;
  const selectedPreviewDepthY = selectedPreview?.depthY ?? 0;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
        <LayoutGrid className="h-5 w-5 text-blue-500" />
        第一步：外箱方案
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
            SKU 名称
          </label>
          <input
            value={activeSku.name}
            onChange={(event) =>
              onPatchSku((sku) => ({
                ...sku,
                name: event.target.value || sku.name,
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
            单位
          </label>
          <select
            value={activeSku.unit}
            onChange={(event) =>
              onPatchSku((sku) => ({
                ...sku,
                unit: event.target.value as Unit,
                selectedPackingIndex: 0,
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          >
            <option value="cm">厘米 (cm)</option>
            <option value="mm">毫米 (mm)</option>
            <option value="in">英寸 (in)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
            打包数量
          </label>
          <input
            type="number"
            min={1}
            value={activeSku.quantity}
            onChange={(event) =>
              onPatchSku((sku) => ({
                ...sku,
                quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                selectedPackingIndex: 0,
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
            SKU 单价 (元/件)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={activeSku.unitPurchasePrice}
            onChange={(event) =>
              onPatchSku((sku) => ({
                ...sku,
                unitPurchasePrice: clampNonNegative(Number.parseFloat(event.target.value) || 0),
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                长度
              </label>
              <input
                type="number"
                min={0}
                value={activeSku.dims.length}
                onChange={(event) =>
                  onPatchSku((sku) => ({
                    ...sku,
                    dims: {
                      ...sku.dims,
                      length: clampNonNegative(Number.parseFloat(event.target.value) || 0),
                    },
                    selectedPackingIndex: 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                宽度
              </label>
              <input
                type="number"
                min={0}
                value={activeSku.dims.width}
                onChange={(event) =>
                  onPatchSku((sku) => ({
                    ...sku,
                    dims: {
                      ...sku.dims,
                      width: clampNonNegative(Number.parseFloat(event.target.value) || 0),
                    },
                    selectedPackingIndex: 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
                高度
              </label>
              <input
                type="number"
                min={0}
                value={activeSku.dims.height}
                onChange={(event) =>
                  onPatchSku((sku) => ({
                    ...sku,
                    dims: {
                      ...sku.dims,
                      height: clampNonNegative(Number.parseFloat(event.target.value) || 0),
                    },
                    selectedPackingIndex: 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-gray-400">
            显示方案数
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={activeSku.maxResults}
            onChange={(event) =>
              onPatchSku((sku) => ({
                ...sku,
                maxResults: Math.min(
                  12,
                  Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                ),
                selectedPackingIndex: 0,
              }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {activeComputed.packingResults.length > 0 ? (
          activeComputed.packingResults.map((result, index) => {
            const isSelected = index === activeComputed.effectiveSelectedIndex;
            const preview = getProjectedPreviewDimensions(result.dims, {
              maxProjectedWidth: 58,
              maxProjectedHeight: 40,
            });
            const resolvedLayoutSegments = resolveLayoutSegments(
              parseLayoutSegments(result.layout),
              result.dims,
              activeSku.dims,
            );
            const layerBoundaries = getBoundaryRatiosByValues(
              resolvedLayoutSegments.map((segment) => segment.segmentHeight),
            );
            const frontX = 16;
            const frontY = 52 - preview.height;
            const frontWidth = preview.length;
            const frontHeight = preview.height;
            const depthX = preview.depthX;
            const depthY = preview.depthY;
            const axisColor = isSelected ? "#1d4ed8" : "#64748b";
            const axisTextColor = isSelected ? "#1e3a8a" : "#475569";
            return (
              <button
                key={`${result.layout}-${index}`}
                type="button"
                onClick={() =>
                  onPatchSku((sku) => ({
                    ...sku,
                    selectedPackingIndex: index,
                  }))
                }
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500">方案 {index + 1}</div>
                    <div className="font-semibold text-gray-800">
                      {result.layout}
                      <span className="ml-1 text-xs font-normal text-gray-500">(行列层)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {result.dims.l} × {result.dims.w} × {result.dims.h} {activeSku.unit}
                    </div>
                    {resolvedLayoutSegments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {resolvedLayoutSegments.map((segment, segmentIndex) => {
                          const xDividers = getGridDividerRatios(
                            segment.countAlongLength,
                            5,
                          );
                          const yDividers = getGridDividerRatios(
                            segment.countAlongWidth,
                            5,
                          );
                          const segmentPreview = getNormalizedLayerGridPreview(
                            result.dims.l,
                            result.dims.w,
                            22,
                          );
                          const segmentRectX = (28 - segmentPreview.width) / 2;
                          const segmentRectY = (28 - segmentPreview.height) / 2;
                          return (
                            <div
                              key={`${result.layout}-segment-${segmentIndex}`}
                              className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] ${
                                isSelected
                                  ? "border-blue-200 bg-blue-100/70 text-blue-800"
                                  : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                            >
                              <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0">
                                <rect
                                  x={segmentRectX}
                                  y={segmentRectY}
                                  width={segmentPreview.width}
                                  height={segmentPreview.height}
                                  fill={isSelected ? "#dbeafe" : "#f8fafc"}
                                  stroke={isSelected ? "#2563eb" : "#94a3b8"}
                                  strokeWidth="1"
                                />
                                {xDividers.map((ratio) => (
                                  <line
                                    key={`x-${ratio}`}
                                    x1={segmentRectX + segmentPreview.width * ratio}
                                    y1={segmentRectY}
                                    x2={segmentRectX + segmentPreview.width * ratio}
                                    y2={segmentRectY + segmentPreview.height}
                                    stroke={isSelected ? "#93c5fd" : "#cbd5e1"}
                                    strokeWidth="0.7"
                                  />
                                ))}
                                {yDividers.map((ratio) => (
                                  <line
                                    key={`y-${ratio}`}
                                    x1={segmentRectX}
                                    y1={segmentRectY + segmentPreview.height * ratio}
                                    x2={segmentRectX + segmentPreview.width}
                                    y2={segmentRectY + segmentPreview.height * ratio}
                                    stroke={isSelected ? "#93c5fd" : "#cbd5e1"}
                                    strokeWidth="0.7"
                                  />
                                ))}
                              </svg>
                              <div className="leading-tight">
                                <div className="font-medium">
                                  {getLayerLabel(segmentIndex, resolvedLayoutSegments.length)}
                                </div>
                                <div className="font-semibold">
                                  {segment.nx} × {segment.ny} × {segment.nz}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  nx→{segment.nxAxis}，ny→{segment.nyAxis}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 130 84" className="h-[62px] w-[104px] shrink-0">
                      <polygon
                        points={`${frontX},${frontY} ${frontX + depthX},${frontY - depthY} ${
                          frontX + depthX + frontWidth
                        },${frontY - depthY} ${frontX + frontWidth},${frontY}`}
                        fill={isSelected ? "#bfdbfe" : "#e5e7eb"}
                        stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                        strokeWidth="1"
                      />
                      <polygon
                        points={`${frontX + frontWidth},${frontY} ${
                          frontX + depthX + frontWidth
                        },${frontY - depthY} ${frontX + depthX + frontWidth},${
                          frontY + frontHeight - depthY
                        } ${frontX + frontWidth},${frontY + frontHeight}`}
                        fill={isSelected ? "#93c5fd" : "#d1d5db"}
                        stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                        strokeWidth="1"
                      />
                      <rect
                        x={frontX}
                        y={frontY}
                        width={frontWidth}
                        height={frontHeight}
                        fill={isSelected ? "#dbeafe" : "#f3f4f6"}
                        stroke={isSelected ? "#1d4ed8" : "#9ca3af"}
                        strokeWidth="1"
                      />
                      {layerBoundaries.map((ratio) => (
                        <line
                          key={`layer-${ratio}`}
                          x1={frontX}
                          y1={frontY + frontHeight * ratio}
                          x2={frontX + frontWidth}
                          y2={frontY + frontHeight * ratio}
                          stroke={isSelected ? "#60a5fa" : "#cbd5e1"}
                          strokeWidth="0.9"
                        />
                      ))}
                      <line
                        x1={frontX}
                        y1={frontY + frontHeight + 6}
                        x2={frontX + frontWidth}
                        y2={frontY + frontHeight + 6}
                        stroke={axisColor}
                        strokeWidth="0.8"
                      />
                      <line
                        x1={frontX + frontWidth + 2}
                        y1={frontY + frontHeight + 1}
                        x2={frontX + frontWidth + depthX + 2}
                        y2={frontY + frontHeight - depthY + 1}
                        stroke={axisColor}
                        strokeWidth="0.8"
                      />
                      <line
                        x1={frontX - 6}
                        y1={frontY + frontHeight}
                        x2={frontX - 6}
                        y2={frontY}
                        stroke={axisColor}
                        strokeWidth="0.8"
                      />
                      <text
                        x={frontX + frontWidth / 2}
                        y={frontY + frontHeight + 12}
                        textAnchor="middle"
                        fontSize="5.6"
                        fill={axisTextColor}
                      >
                        L {result.dims.l}
                      </text>
                      <text
                        x={frontX + frontWidth + depthX / 2 + 3}
                        y={frontY + frontHeight - depthY / 2 + 1}
                        textAnchor="middle"
                        fontSize="5.6"
                        fill={axisTextColor}
                      >
                        W {result.dims.w}
                      </text>
                      <text
                        x={frontX - 9}
                        y={frontY + frontHeight / 2}
                        textAnchor="middle"
                        fontSize="5.6"
                        fill={axisTextColor}
                      >
                        H {result.dims.h}
                      </text>
                    </svg>
                    <div className="text-right text-xs text-gray-500">
                      <div>立体预览</div>
                      <div className="font-bold text-gray-700">{result.ratio} : 1</div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-300"}`}
                    />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400">
            <RotateCcw className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">请输入有效尺寸和数量后选择外箱方案</p>
          </div>
        )}
      </div>

      {selectedPackingResult && selectedPreview ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">摆放方式大图</h3>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              共 {selectedLayoutLayers.length} 层
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <svg viewBox="0 0 250 170" className="h-[180px] w-full">
                <polygon
                  points={`${selectedPreviewFrontX},${selectedPreviewFrontY} ${
                    selectedPreviewFrontX + selectedPreviewDepthX
                  },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                    selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                  },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                    selectedPreviewFrontX + selectedPreviewFrontWidth
                  },${selectedPreviewFrontY}`}
                  fill="#bfdbfe"
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                />
                <polygon
                  points={`${selectedPreviewFrontX + selectedPreviewFrontWidth},${
                    selectedPreviewFrontY
                  } ${
                    selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                  },${selectedPreviewFrontY - selectedPreviewDepthY} ${
                    selectedPreviewFrontX + selectedPreviewDepthX + selectedPreviewFrontWidth
                  },${selectedPreviewFrontY + selectedPreviewFrontHeight - selectedPreviewDepthY} ${
                    selectedPreviewFrontX + selectedPreviewFrontWidth
                  },${selectedPreviewFrontY + selectedPreviewFrontHeight}`}
                  fill="#93c5fd"
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                />
                <rect
                  x={selectedPreviewFrontX}
                  y={selectedPreviewFrontY}
                  width={selectedPreviewFrontWidth}
                  height={selectedPreviewFrontHeight}
                  fill="#dbeafe"
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                />
                {selectedLayerBoundaries.map((ratio) => (
                  <line
                    key={`selected-layer-${ratio}`}
                    x1={selectedPreviewFrontX}
                    y1={selectedPreviewFrontY + selectedPreviewFrontHeight * ratio}
                    x2={selectedPreviewFrontX + selectedPreviewFrontWidth}
                    y2={selectedPreviewFrontY + selectedPreviewFrontHeight * ratio}
                    stroke="#60a5fa"
                    strokeWidth="1"
                  />
                ))}
                <line
                  x1={selectedPreviewFrontX}
                  y1={selectedPreviewFrontY + selectedPreviewFrontHeight + 12}
                  x2={selectedPreviewFrontX + selectedPreviewFrontWidth}
                  y2={selectedPreviewFrontY + selectedPreviewFrontHeight + 12}
                  stroke="#1e3a8a"
                  strokeWidth="1.2"
                />
                <line
                  x1={selectedPreviewFrontX + selectedPreviewFrontWidth + 3}
                  y1={selectedPreviewFrontY + selectedPreviewFrontHeight + 1}
                  x2={
                    selectedPreviewFrontX +
                    selectedPreviewFrontWidth +
                    selectedPreviewDepthX +
                    3
                  }
                  y2={
                    selectedPreviewFrontY +
                    selectedPreviewFrontHeight -
                    selectedPreviewDepthY +
                    1
                  }
                  stroke="#1e3a8a"
                  strokeWidth="1.2"
                />
                <line
                  x1={selectedPreviewFrontX - 10}
                  y1={selectedPreviewFrontY + selectedPreviewFrontHeight}
                  x2={selectedPreviewFrontX - 10}
                  y2={selectedPreviewFrontY}
                  stroke="#1e3a8a"
                  strokeWidth="1.2"
                />
                <text
                  x={selectedPreviewFrontX + selectedPreviewFrontWidth / 2}
                  y={selectedPreviewFrontY + selectedPreviewFrontHeight + 24}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#1e3a8a"
                >
                  L {selectedPackingResult.dims.l} {activeSku.unit}
                </text>
                <text
                  x={
                    selectedPreviewFrontX +
                    selectedPreviewFrontWidth +
                    selectedPreviewDepthX / 2 +
                    6
                  }
                  y={
                    selectedPreviewFrontY +
                    selectedPreviewFrontHeight -
                    selectedPreviewDepthY / 2 +
                    2
                  }
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#1e3a8a"
                >
                  W {selectedPackingResult.dims.w} {activeSku.unit}
                </text>
                <text
                  x={selectedPreviewFrontX - 14}
                  y={selectedPreviewFrontY + selectedPreviewFrontHeight / 2}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#1e3a8a"
                >
                  H {selectedPackingResult.dims.h} {activeSku.unit}
                </text>
              </svg>
              <p className="mt-2 text-center text-xs font-medium text-slate-600">
                外箱 {selectedPackingResult.dims.l} × {selectedPackingResult.dims.w} ×{" "}
                {selectedPackingResult.dims.h} {activeSku.unit}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {selectedLayoutLayers.map((layer, layerIndex) => {
                const xDividers = getGridDividerRatios(layer.countAlongLength, 6);
                const yDividers = getGridDividerRatios(layer.countAlongWidth, 6);
                const units = layer.nx * layer.ny;
                const layerHeight = layer.layerHeight;
                const layerPreview = getNormalizedLayerGridPreview(
                  selectedPackingResult.dims.l,
                  selectedPackingResult.dims.w,
                  44,
                );
                const layerRectX = (56 - layerPreview.width) / 2;
                const layerRectY = (56 - layerPreview.height) / 2;

                return (
                  <div
                    key={`selected-layer-grid-${layerIndex}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {getLayerLabel(layerIndex, selectedLayoutLayers.length)}
                      </span>
                      <span className="text-slate-500">{units} 件</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 56 56" className="h-12 w-12 shrink-0">
                        <rect
                          x={layerRectX}
                          y={layerRectY}
                          width={layerPreview.width}
                          height={layerPreview.height}
                          fill="#f8fafc"
                          stroke="#94a3b8"
                          strokeWidth="1.1"
                        />
                        {xDividers.map((ratio) => (
                          <line
                            key={`selected-x-${layerIndex}-${ratio}`}
                            x1={layerRectX + layerPreview.width * ratio}
                            y1={layerRectY}
                            x2={layerRectX + layerPreview.width * ratio}
                            y2={layerRectY + layerPreview.height}
                            stroke="#cbd5e1"
                            strokeWidth="0.8"
                          />
                        ))}
                        {yDividers.map((ratio) => (
                          <line
                            key={`selected-y-${layerIndex}-${ratio}`}
                            x1={layerRectX}
                            y1={layerRectY + layerPreview.height * ratio}
                            x2={layerRectX + layerPreview.width}
                            y2={layerRectY + layerPreview.height * ratio}
                            stroke="#cbd5e1"
                            strokeWidth="0.8"
                          />
                        ))}
                      </svg>
                      <div className="leading-tight text-xs">
                        <div className="font-semibold text-slate-700">
                          {layer.nx} 行 × {layer.ny} 列
                        </div>
                        <div className="text-slate-500">
                          方向 nx→{layer.nxAxis}，ny→{layer.nyAxis}
                        </div>
                        <div className="text-slate-500">
                          尺寸 {toDimensionText(selectedPackingResult.dims.l)} ×{" "}
                          {toDimensionText(selectedPackingResult.dims.w)} ×{" "}
                          {toDimensionText(layerHeight)} {activeSku.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PackingSection;
