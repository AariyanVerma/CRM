import { prisma } from "@/lib/db"

/** Calendar day at local midnight (matches existing DailyPrice date usage). */
export function getTodayDateBound(date = new Date()) {
  const today = new Date(date)
  today.setHours(0, 0, 0, 0)
  return today
}

/** Most recent DailyPrice strictly before the given day (usually yesterday). */
export async function getPreviousDailyPrice(before = getTodayDateBound()) {
  return prisma.dailyPrice.findFirst({
    where: { date: { lt: before } },
    orderBy: { date: "desc" },
  })
}

/**
 * Values to seed a new today's row from the last saved day.
 * Falls back to hardcoded defaults only when the DB has never had a DailyPrice.
 */
export async function getDailyPriceCreateSeed(today = getTodayDateBound()) {
  const previous = await getPreviousDailyPrice(today)

  return {
    gold: previous?.gold ?? 2000,
    silver: previous?.silver ?? 25,
    platinum: previous?.platinum ?? 1000,
    scrapGoldPercentage: previous?.scrapGoldPercentage ?? 95,
    scrapSilverPercentage: previous?.scrapSilverPercentage ?? 95,
    scrapPlatinumPercentage: previous?.scrapPlatinumPercentage ?? 95,
    meltGoldPercentage: previous?.meltGoldPercentage ?? 95,
    meltSilverPercentage: previous?.meltSilverPercentage ?? 95,
    meltPlatinumPercentage: previous?.meltPlatinumPercentage ?? 95,
  }
}
