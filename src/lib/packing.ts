export type PackingDims = {
  length: number;
  width: number;
  height: number;
};

export type PackingResult = {
  layout: string;
  dims: {
    l: number;
    w: number;
    h: number;
  };
  volume: number;
  score: number;
  ratio: string;
};

export type PackingLayoutSegment = {
  nx: number;
  ny: number;
  nz: number;
};

type FactorGroup = [number, number, number];
type RawPreviewDims = { l: number; w: number; h: number };
type FactorPair = [number, number];

export type PreviewDimensions = {
  length: number;
  width: number;
  height: number;
};

export type LayerGridPreview = {
  width: number;
  height: number;
};

export const getFactorGroups = (n: number): FactorGroup[] => {
  const factors: FactorGroup[] = [];

  for (let i = 1; i <= n; i += 1) {
    if (n % i !== 0) {
      continue;
    }

    for (let j = 1; j <= n / i; j += 1) {
      if ((n / i) % j !== 0) {
        continue;
      }

      const k = n / (i * j);
      factors.push([i, j, k]);
    }
  }

  return factors;
};

export const parseLayoutSegments = (layout: string): PackingLayoutSegment[] => {
  if (!layout) {
    return [];
  }

  const segmentPattern = /^\s*(\d+)\s*[×xX*]\s*(\d+)\s*[×xX*]\s*(\d+)\s*$/;
  const segments: PackingLayoutSegment[] = [];

  for (const rawSegment of layout.split("+")) {
    const match = rawSegment.match(segmentPattern);
    if (!match) {
      continue;
    }

    segments.push({
      nx: Number.parseInt(match[1], 10),
      ny: Number.parseInt(match[2], 10),
      nz: Number.parseInt(match[3], 10),
    });
  }

  return segments;
};

export const expandLayoutLayers = (layout: string): PackingLayoutSegment[] => {
  const segments = parseLayoutSegments(layout);
  const layers: PackingLayoutSegment[] = [];

  for (const segment of segments) {
    const layerCount = Number.isFinite(segment.nz) ? Math.max(1, Math.floor(segment.nz)) : 1;
    for (let i = 0; i < layerCount; i += 1) {
      layers.push({
        nx: segment.nx,
        ny: segment.ny,
        nz: 1,
      });
    }
  }

  return layers;
};

const getFactorPairs = (n: number): FactorPair[] => {
  const pairs: FactorPair[] = [];

  for (let i = 1; i * i <= n; i += 1) {
    if (n % i !== 0) {
      continue;
    }

    const j = n / i;
    pairs.push([i, j]);
    if (i !== j) {
      pairs.push([j, i]);
    }
  }

  return pairs;
};

const getUniqueOrientations = (dims: PackingDims): PackingDims[] => {
  const permutations: Array<[number, number, number]> = [
    [dims.length, dims.width, dims.height],
    [dims.length, dims.height, dims.width],
    [dims.width, dims.length, dims.height],
    [dims.width, dims.height, dims.length],
    [dims.height, dims.length, dims.width],
    [dims.height, dims.width, dims.length],
  ];
  const seen = new Set<string>();
  const unique: PackingDims[] = [];

  for (const [length, width, height] of permutations) {
    const key = `${length},${width},${height}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({ length, width, height });
  }

  return unique;
};

const buildPackingResult = (
  layout: string,
  outL: number,
  outW: number,
  outH: number,
): PackingResult => {
  const maxDim = Math.max(outL, outW, outH);
  const minDim = Math.min(outL, outW, outH);
  const avgDim = (outL + outW + outH) / 3;

  const variance =
    (Math.pow(outL - avgDim, 2) + Math.pow(outW - avgDim, 2) + Math.pow(outH - avgDim, 2)) /
    3;
  const score = Math.sqrt(variance);

  return {
    layout,
    dims: { l: outL, w: outW, h: outH },
    volume: outL * outW * outH,
    score,
    ratio: (maxDim / minDim).toFixed(2),
  };
};

const calculateMixedLayerResults = (
  dims: PackingDims,
  quantity: number,
): PackingResult[] => {
  if (quantity < 2) {
    return [];
  }

  const orientations = getUniqueOrientations(dims);
  const mixedResults: PackingResult[] = [];

  for (let lowerQuantity = 1; lowerQuantity < quantity; lowerQuantity += 1) {
    const upperQuantity = quantity - lowerQuantity;
    const lowerPairs = getFactorPairs(lowerQuantity);
    const upperPairs = getFactorPairs(upperQuantity);

    for (const lowerOrientation of orientations) {
      for (const [lowerNx, lowerNy] of lowerPairs) {
        const lowerL = lowerNx * lowerOrientation.length;
        const lowerW = lowerNy * lowerOrientation.width;
        const lowerH = lowerOrientation.height;

        for (const upperOrientation of orientations) {
          for (const [upperNx, upperNy] of upperPairs) {
            const upperL = upperNx * upperOrientation.length;
            const upperW = upperNy * upperOrientation.width;
            const sameBase = lowerL === upperL && lowerW === upperW;
            const rotatedBase = lowerL === upperW && lowerW === upperL;
            if (!sameBase && !rotatedBase) {
              continue;
            }

            mixedResults.push(
              buildPackingResult(
                `${lowerNx} × ${lowerNy} × 1 + ${upperNx} × ${upperNy} × 1`,
                lowerL,
                lowerW,
                lowerH + upperOrientation.height,
              ),
            );
          }
        }
      }
    }
  }

  return mixedResults;
};

export const calculatePackingResults = (
  dims: PackingDims,
  quantity: number,
  maxResults = Number.POSITIVE_INFINITY,
): PackingResult[] => {
  if (!dims.length || !dims.width || !dims.height || !quantity) {
    return [];
  }

  const normalizedMaxResults = Number.isFinite(maxResults)
    ? Math.max(0, Math.floor(maxResults))
    : Number.POSITIVE_INFINITY;

  if (normalizedMaxResults === 0) {
    return [];
  }

  const groups = getFactorGroups(quantity);
  const calculations = groups.map(([nx, ny, nz]): PackingResult =>
    buildPackingResult(`${nx} × ${ny} × ${nz}`, nx * dims.length, ny * dims.width, nz * dims.height),
  );
  calculations.push(...calculateMixedLayerResults(dims, quantity));

  const uniqueResults: PackingResult[] = [];
  const seen = new Set<string>();

  const sortedCalculations = calculations.sort((a, b) => a.score - b.score);
  for (const result of sortedCalculations) {
    const key = [result.dims.l, result.dims.w, result.dims.h]
      .sort((a, b) => a - b)
      .join(",");

    if (seen.has(key)) {
      continue;
    }

    uniqueResults.push(result);
    seen.add(key);

    if (uniqueResults.length >= normalizedMaxResults) {
      break;
    }
  }

  return uniqueResults;
};

export const getNormalizedPreviewDimensions = (
  dims: RawPreviewDims,
  maxSize = 44,
  minSize = 8,
): PreviewDimensions => {
  const safeDims = [dims.l, dims.w, dims.h].map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const maxDim = Math.max(...safeDims);

  if (maxDim <= 0) {
    return { length: minSize, width: minSize, height: minSize };
  }

  const scale = maxSize / maxDim;
  const toPixel = (value: number) => {
    if (value <= 0) {
      return 0;
    }

    return Math.max(1, Math.round(value * scale));
  };

  return {
    length: toPixel(safeDims[0]),
    width: toPixel(safeDims[1]),
    height: toPixel(safeDims[2]),
  };
};

export const getNormalizedLayerGridPreview = (
  nx: number,
  ny: number,
  maxSize = 48,
): LayerGridPreview => {
  const safeNx = Number.isFinite(nx) && nx > 0 ? Math.max(1, Math.floor(nx)) : 1;
  const safeNy = Number.isFinite(ny) && ny > 0 ? Math.max(1, Math.floor(ny)) : 1;
  const safeMaxSize =
    Number.isFinite(maxSize) && maxSize > 0 ? Math.max(2, Math.floor(maxSize)) : 2;
  const scale = safeMaxSize / Math.max(safeNx, safeNy);

  return {
    width: Math.max(2, Math.round(safeNx * scale)),
    height: Math.max(2, Math.round(safeNy * scale)),
  };
};
