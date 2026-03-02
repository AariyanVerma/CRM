


export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM'
export type TransactionType = 'SCRAP' | 'MELT'

export type GoldPurity = '24K' | '22K' | '21K' | '18K' | '16K' | '14K' | '13K' | '12K' | '11K' | '10K' | '9K'
export type SilverPurity = '925' | '900' | '800'
export type PlatinumPurity = '950' | '900'

export const GOLD_PURITIES: GoldPurity[] = ['24K', '22K', '21K', '18K', '16K', '14K', '13K', '12K', '11K', '10K', '9K']
export const SILVER_PURITIES: SilverPurity[] = ['925', '900', '800']
export const PLATINUM_PURITIES: PlatinumPurity[] = ['950', '900']



function purityToValue(purity: string): number {
  if (purity.endsWith('K')) {
    const k = parseInt(purity.replace('K', ''))
    return (k / 24) * 1000
  }
  return parseFloat(purity)
}



export function calculateScrapGoldPricePerDWT(
  purity: GoldPurity,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  const karatValue = parseInt(purity.replace('K', ''))
  const result = ((goldSpotPrice * (karatValue - 0.5)) / 24) * ((percentage / 20) / 100)
  return Math.max(0, result)
}



export function calculateScrapSilverPricePerDWT(
  purity: SilverPurity,
  silverSpotPrice: number,
  percentage: number = 95
): number {
  const purityValue = parseFloat(purity)
  const result = ((silverSpotPrice * purityValue) / 1000) * ((percentage / 20) / 100)
  return Math.max(0, result)
}



export function calculateScrapPlatinumPricePerDWT(
  purity: PlatinumPurity,
  platinumSpotPrice: number,
  percentage: number = 95
): number {
  const purityValue = parseFloat(purity)
  const result = ((platinumSpotPrice * purityValue) / 1000) * ((percentage / 20) / 100)
  return Math.max(0, result)
}



export function calculateMeltGoldPricePerDWT(
  goldSpotPrice: number,
  purityPercentage: number,
  dwt: number,
  percentage: number = 95
): number {
  if (dwt === 0) return 0
  const result = ((goldSpotPrice * purityPercentage) / 100) * ((dwt / 20) * percentage) / 100
  return Math.max(0, result)
}



export function calculateMeltSilverPricePerDWT(
  silverSpotPrice: number,
  purityPercentage: number,
  dwt: number,
  percentage: number = 95
): number {
  if (dwt === 0) return 0
  const result = ((silverSpotPrice * purityPercentage) / 100) * ((dwt / 20) * percentage) / 100
  return Math.max(0, result)
}



export function calculateMeltPlatinumPricePerDWT(
  platinumSpotPrice: number,
  purityPercentage: number,
  dwt: number,
  percentage: number = 95
): number {
  if (dwt === 0) return 0
  const result = ((platinumSpotPrice * purityPercentage) / 100) * ((dwt / 20) * percentage) / 100
  return Math.max(0, result)
}



export function calculateLineTotal(pricePerDWT: number, dwt: number): number {
  return pricePerDWT * dwt
}



export function getScrapPricingRows(
  metalType: MetalType,
  spotPrice: number,
  currentDwtValues: Record<string, number> = {},
  percentage: number = 95
) {
  switch (metalType) {
    case 'GOLD':
      return GOLD_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerDWT = calculateScrapGoldPricePerDWT(purity, spotPrice, percentage)
        const lineTotal = calculateLineTotal(pricePerDWT, dwt)
        return {
          purity,
          pricePerDWT,
          dwt,
          lineTotal,
        }
      })
    case 'SILVER':
      return SILVER_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerDWT = calculateScrapSilverPricePerDWT(purity, spotPrice, percentage)
        const lineTotal = calculateLineTotal(pricePerDWT, dwt)
        return {
          purity,
          pricePerDWT,
          dwt,
          lineTotal,
        }
      })
    case 'PLATINUM':
      return PLATINUM_PURITIES.map(purity => {
        const dwt = currentDwtValues[purity] || 0
        const pricePerDWT = calculateScrapPlatinumPricePerDWT(purity, spotPrice, percentage)
        const lineTotal = calculateLineTotal(pricePerDWT, dwt)
        return {
          purity,
          pricePerDWT,
          dwt,
          lineTotal,
        }
      })
  }
}



export function getMeltPricingRows(
  metalType: MetalType,
  spotPrice: number,
  currentDwtValues: Record<string, number> = {},
  currentPurityPercentages: Record<string, number> = {},
  percentage: number = 95
) {
  const meltKey = metalType
  const dwt = currentDwtValues[meltKey] || 0
  const purityPercentage = currentPurityPercentages[meltKey] || 0
  
  let pricePerDWT = 0
  switch (metalType) {
    case 'GOLD':
      pricePerDWT = calculateMeltGoldPricePerDWT(spotPrice, purityPercentage, dwt, percentage)
      break
    case 'SILVER':
      pricePerDWT = calculateMeltSilverPricePerDWT(spotPrice, purityPercentage, dwt, percentage)
      break
    case 'PLATINUM':
      pricePerDWT = calculateMeltPlatinumPricePerDWT(spotPrice, purityPercentage, dwt, percentage)
      break
  }
  const lineTotal = pricePerDWT
  return [{
    purity: meltKey,
    pricePerDWT,
    dwt,
    purityPercentage,
    lineTotal,
  }]
}
export function getPricingRows(
  metalType: MetalType,
  spotPrice: number,
  currentDwtValues: Record<string, number> = {},
  percentage: number = 95
) {
  return getScrapPricingRows(metalType, spotPrice, currentDwtValues, percentage)
}
export function calculateGoldPricePerOz(
  purity: GoldPurity,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  return calculateScrapGoldPricePerDWT(purity, goldSpotPrice, percentage)
}

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
