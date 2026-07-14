export const PHONE_DISPLAY = "(917) 204-0009"
export const PHONE_HREF = "tel:+19172040009"
export const MAPS_QUERY =
  "New York Gold Market, 33 W 47th St Window #2, New York, NY 10036"
export const MAPS_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`
export const MAPS_EMBED_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(MAPS_QUERY)}&z=17&hl=en&output=embed`
export const PUBLIC_GRAMS_PER_DWT = 1.55517

export type WeightUnit = "DWT" | "GRAM"

export function toDwt(weight: number, unit: WeightUnit): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0
  return unit === "DWT" ? weight : weight / PUBLIC_GRAMS_PER_DWT
}

export function fromDwt(dwt: number, unit: WeightUnit): number {
  if (!Number.isFinite(dwt) || dwt <= 0) return 0
  return unit === "DWT" ? dwt : dwt * PUBLIC_GRAMS_PER_DWT
}

export function lineTotal(weight: number, unit: WeightUnit, pricePerDwt: number): number {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(pricePerDwt)) return 0
  return toDwt(weight, unit) * pricePerDwt
}
