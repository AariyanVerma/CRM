/**
 * Pricing formulas for precious metals
 * All formulas return price per ounce (oz)
 */

export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM'

export type GoldPurity = '24K' | '22K' | '21K' | '18K' | '16K' | '14K' | '13K' | '12K' | '10K' | '9K'
export type SilverPurity = '925' | '900' | '800'
export type PlatinumPurity = '950' | '900'

export const GOLD_PURITIES: GoldPurity[] = ['24K', '22K', '21K', '18K', '16K', '14K', '13K', '12K', '10K', '9K']
export const SILVER_PURITIES: SilverPurity[] = ['925', '900', '800']
export const PLATINUM_PURITIES: PlatinumPurity[] = ['950', '900']

/**
 * Convert purity label to numeric value (0-1000)
 */
function purityToValue(purity: string): number {
  if (purity.endsWith('K')) {
    const k = parseInt(purity.replace('K', ''))
    return (k / 24) * 1000
  }
  return parseFloat(purity)
}

/**
 * Calculate gold price per ounce
 * Formula: (purityValue - 0.50) * (goldPriceToday / 24) * 99.9 / 20 / 100
 * purityValue is the karat value (24, 22, 18, etc.)
 */
export function calculateGoldPricePerOz(
  purity: GoldPurity,
  goldSpotPrice: number
): number {
  // Extract karat value (24, 22, 18, etc.)
  const karatValue = parseInt(purity.replace('K', ''))
  const result = (karatValue - 0.50) * (goldSpotPrice / 24) * 99.9 / 20 / 100
  return Math.max(0, result) // Ensure non-negative
}

/**
 * Calculate silver price per ounce
 * Formulas:
 * - 925: 823.5 * silverPriceToday / 1000
 * - 900: 821.25 * silverPriceToday / 1000
 * - 800: 730 * silverPriceToday / 1000
 */
export function calculateSilverPricePerOz(
  purity: SilverPurity,
  silverSpotPrice: number
): number {
  const multipliers: Record<SilverPurity, number> = {
    '925': 823.5,
    '900': 821.25,
    '800': 730,
  }
  return (multipliers[purity] * silverSpotPrice) / 1000
}

/**
 * Calculate platinum price per ounce
 * Formula: (platinumPriceToday * (purity/1000)) * ((85 / DWT) / 100)
 * Handle DWT=0 safely => 0
 */
export function calculatePlatinumPricePerOz(
  purity: PlatinumPurity,
  platinumSpotPrice: number,
  dwt: number
): number {
  if (dwt === 0) return 0
  const purityValue = purityToValue(purity) / 1000
  const result = (platinumSpotPrice * purityValue) * ((85 / dwt) / 100)
  return Math.max(0, result)
}

/**
 * Calculate line total: pricePerOz * dwt
 */
export function calculateLineTotal(pricePerOz: number, dwt: number): number {
  return pricePerOz * dwt
}

/**
 * Get all pricing rows for a metal type
 */
export function getPricingRows(
  metalType: MetalType,
  spotPrice: number,
  currentDwtValues: Record<string, number> = {}
) {
  switch (metalType) {
    case 'GOLD':
      return GOLD_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerOz = calculateGoldPricePerOz(purity, spotPrice)
        const lineTotal = calculateLineTotal(pricePerOz, dwt)
        return {
          purity,
          pricePerOz,
          dwt,
          lineTotal,
        }
      })
    case 'SILVER':
      return SILVER_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerOz = calculateSilverPricePerOz(purity, spotPrice)
        const lineTotal = calculateLineTotal(pricePerOz, dwt)
        return {
          purity,
          pricePerOz,
          dwt,
          lineTotal,
        }
      })
    case 'PLATINUM':
      return PLATINUM_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerOz = calculatePlatinumPricePerOz(purity, spotPrice, dwt)
        const lineTotal = calculateLineTotal(pricePerOz, dwt)
        return {
          purity,
          pricePerOz,
          dwt,
          lineTotal,
        }
      })
  }
}

