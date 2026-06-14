import type { SkinData } from "@/types";

/** YouCam raw_score: 100 = best condition, lower = more concern */
export const SKIN_METRIC_LABELS: Record<keyof SkinData, string> = {
  moisture: "水分量",
  wrinkle: "シワの少なさ",
  pore: "毛穴の目立ちにくさ",
  acne: "ニキビ・肌荒れの少なさ",
};

export const SKIN_SCORE_LEGEND =
  "100点満点。高いほどその項目で良好な状態";

export type SkinMetric = {
  key: keyof SkinData;
  label: string;
  score: number;
};

export function skinMetrics(data: SkinData): SkinMetric[] {
  return (Object.keys(SKIN_METRIC_LABELS) as (keyof SkinData)[]).map(
    (key) => ({
      key,
      label: SKIN_METRIC_LABELS[key],
      score: data[key],
    })
  );
}
