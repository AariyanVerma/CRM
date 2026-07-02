import { sortPuritiesAsc } from "@/lib/purity"
import { GRAMS_PER_DWT, toDwt, type WeightUnit } from "@/lib/weight-units"

const TROY_OZ_DWT = 20



export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM'
export type TransactionType = 'SCRAP' | 'SALE' | 'MELT'

export type GoldPurity = '24K' | '22K' | '21.6K' | '21K' | '18K' | '16K' | '14K' | '13K' | '12K' | '11K' | '10K' | '9K'
export type SilverPurity = '925' | '900' | '800'
export type PlatinumPurity = '950' | '900'

export const GOLD_PURITIES: GoldPurity[] = sortPuritiesAsc<GoldPurity>(['24K', '22K', '21.6K', '21K', '18K', '16K', '14K', '13K', '12K', '11K', '10K', '9K'])

export const SCRAP_GOLD_CUSTOM_ROW_KEY = 'CUSTOM'
export const SCRAP_GOLD_COIN_CUSTOM_ROW_KEY = 'GOLD_COIN_CUSTOM'
export const SCRAP_GOLD_COIN_PURITY_PREFIX = 'GC:'

export function isStandardGoldScrapPurity(purityLabel: string): purityLabel is GoldPurity {
  return (GOLD_PURITIES as readonly string[]).includes(purityLabel)
}

export function parseGoldKaratFromLabel(purityLabel: string): number | null {
  const match = String(purityLabel).trim().match(/^(\d+(?:\.\d+)?)\s*K$/i)
  if (!match) return null
  const karat = parseFloat(match[1])
  if (!Number.isFinite(karat) || karat <= 0 || karat > 24) return null
  return karat
}

export function formatGoldKaratLabel(karat: number): string {
  if (!Number.isFinite(karat) || karat <= 0) return ''
  const rounded = Math.round(karat * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}K`
}

export const SALE_GOLD_PURITIES: GoldPurity[] = ['21K', '21.6K', '22K', '24K']
export const SILVER_PURITIES: SilverPurity[] = sortPuritiesAsc<SilverPurity>(['925', '900', '800'])
export const PLATINUM_PURITIES: PlatinumPurity[] = sortPuritiesAsc<PlatinumPurity>(['950', '900'])



function purityToValue(purity: string): number {
  if (purity.endsWith('K')) {
    const k = parseFloat(purity.replace('K', ''))
    return (k / 24) * 1000
  }
  return parseFloat(purity)
}



export function calculateScrapGoldPricePerDWTFromKarat(
  karatValue: number,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  if (!Number.isFinite(karatValue) || karatValue <= 0) return 0
  const result = ((goldSpotPrice * (karatValue - 0.5)) / 24) * ((percentage / 20) / 100)
  return Math.max(0, result)
}

export function calculateGoldCoinPricePerDWTFromKarat(
  karatValue: number,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  if (!Number.isFinite(karatValue) || karatValue <= 0) return 0
  const result = ((goldSpotPrice * karatValue) / 24) * ((percentage / 20) / 100)
  return Math.max(0, result)
}

export function isGoldCoinPurityLabel(purityLabel: string): boolean {
  return String(purityLabel).startsWith(SCRAP_GOLD_COIN_PURITY_PREFIX)
}

export function formatGoldCoinPurityLabel(karat: number): string {
  const label = formatGoldKaratLabel(karat)
  return label ? `${SCRAP_GOLD_COIN_PURITY_PREFIX}${label}` : ""
}

export function parseGoldCoinPurityLabel(purityLabel: string): number | null {
  if (!isGoldCoinPurityLabel(purityLabel)) return null
  return parseGoldKaratFromLabel(purityLabel.slice(SCRAP_GOLD_COIN_PURITY_PREFIX.length))
}

export function displayGoldCoinPurityLabel(purityLabel: string): string {
  if (isGoldCoinPurityLabel(purityLabel)) {
    return purityLabel.slice(SCRAP_GOLD_COIN_PURITY_PREFIX.length)
  }
  return purityLabel
}

export function resolveScrapGoldPricePerDWT(
  purityLabel: string,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  const coinKarat = parseGoldCoinPurityLabel(purityLabel)
  if (coinKarat != null) {
    return calculateGoldCoinPricePerDWTFromKarat(coinKarat, goldSpotPrice, percentage)
  }
  return calculateScrapGoldPricePerDWT(purityLabel, goldSpotPrice, percentage)
}

export function calculateScrapGoldPricePerDWT(
  purity: GoldPurity | string,
  goldSpotPrice: number,
  percentage: number = 95
): number {
  const karatValue = parseGoldKaratFromLabel(purity) ?? parseFloat(String(purity).replace(/K/i, ''))
  return calculateScrapGoldPricePerDWTFromKarat(karatValue, goldSpotPrice, percentage)
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

function goldKaratFraction(purity: GoldPurity): number {
  return parseFloat(purity.replace("K", "")) / 24
}

export function calculateSaleGoldPricePerDWT(goldSpotPrice: number, purity: GoldPurity): number {
  if (goldSpotPrice <= 0) return 0
  return (goldSpotPrice * goldKaratFraction(purity)) / TROY_OZ_DWT
}

export function calculateSaleGoldPricePerGram(goldSpotPrice: number, purity: GoldPurity): number {
  if (goldSpotPrice <= 0) return 0
  return (goldSpotPrice * goldKaratFraction(purity)) / (TROY_OZ_DWT * GRAMS_PER_DWT)
}

export function calculateSalePremiumAmount(
  premiumPerOz: number,
  weight: number,
  unit: WeightUnit
): number {
  const dwt = toDwt(weight, unit)
  if (dwt <= 0 || premiumPerOz <= 0) return 0
  return premiumPerOz * (dwt / TROY_OZ_DWT)
}

export type SaleRowCalc = {
  dwt: number
  pricePerUnit: number
  metalValue: number
  premiumAmount: number
  lineTotal: number
  pricePerDWT: number
}

export function calculateSaleRowValue(
  goldSpotPrice: number,
  purity: GoldPurity,
  weight: number | string,
  unit: WeightUnit,
  premiumPerOz: number
): SaleRowCalc {
  const w = typeof weight === "number" ? weight : parseFloat(String(weight)) || 0
  const dwt = toDwt(w, unit)
  const pricePerDWT = calculateSaleGoldPricePerDWT(goldSpotPrice, purity)
  const pricePerGram = calculateSaleGoldPricePerGram(goldSpotPrice, purity)
  const pricePerUnit = unit === "DWT" ? pricePerDWT : pricePerGram
  const metalValue = w > 0 ? pricePerUnit * w : 0
  const premiumAmount = calculateSalePremiumAmount(premiumPerOz, w, unit)
  const lineTotal = metalValue + premiumAmount
  return { dwt, pricePerUnit, metalValue, premiumAmount, lineTotal, pricePerDWT }
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
