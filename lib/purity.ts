export function purityToNumericValue(purityLabel: string): number {
  const label = String(purityLabel || "").trim().toUpperCase()
  const karatMatch = label.match(/^(\d+(?:\.\d+)?)K$/)
  if (karatMatch) return Number(karatMatch[1])
  const numeric = Number(label.replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY
}

export function comparePurityAsc(a: string, b: string): number {
  const av = purityToNumericValue(a)
  const bv = purityToNumericValue(b)
  if (av !== bv) return av - bv
  return a.localeCompare(b)
}

export function sortPuritiesAsc<T extends string>(labels: T[]): T[] {
  return [...labels].sort((a, b) => comparePurityAsc(a, b))
}
