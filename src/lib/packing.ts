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

type FactorGroup = [number, number, number];
type RawPreviewDims = { l: number; w: number; h: number };

export type PreviewDimensions = {
  length: number;
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
  const calculations = groups.map(([nx, ny, nz]): PackingResult => {
    const outL = nx * dims.length;
    const outW = ny * dims.width;
    const outH = nz * dims.height;

    const maxDim = Math.max(outL, outW, outH);
    const minDim = Math.min(outL, outW, outH);
    const avgDim = (outL + outW + outH) / 3;

    const variance =
      (Math.pow(outL - avgDim, 2) +
        Math.pow(outW - avgDim, 2) +
        Math.pow(outH - avgDim, 2)) /
      3;
    const score = Math.sqrt(variance);

    return {
      layout: `${nx} × ${ny} × ${nz}`,
      dims: { l: outL, w: outW, h: outH },
      volume: outL * outW * outH,
      score,
      ratio: (maxDim / minDim).toFixed(2),
    };
  });

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
  const toPixel = (value: number) => Math.max(minSize, Math.round(value * scale));

  return {
    length: toPixel(safeDims[0]),
    width: toPixel(safeDims[1]),
    height: toPixel(safeDims[2]),
  };
};
