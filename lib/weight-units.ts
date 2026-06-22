export type WeightUnit = "DWT" | "GRAM"

export const GRAMS_PER_DWT = 1.55517384

export function toDwt(weight: number, unit: WeightUnit): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0
  return unit === "DWT" ? weight : weight / GRAMS_PER_DWT
}

export function fromDwt(dwt: number, unit: WeightUnit): number {
  if (!Number.isFinite(dwt) || dwt <= 0) return 0
  return unit === "DWT" ? dwt : dwt * GRAMS_PER_DWT
}

export function formatWeightInput(value: number, unit: WeightUnit): string {
  if (!Number.isFinite(value) || value <= 0) return ""
  const rounded = unit === "DWT" ? Math.round(value * 1000) / 1000 : Math.round(value * 100) / 100
  return String(rounded)
}
