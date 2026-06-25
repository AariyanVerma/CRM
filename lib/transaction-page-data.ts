import { prisma } from "@/lib/db"

export type DraftLineItem = {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
  purityPercentage?: number | null
}

export type DraftTransaction = {
  id: string | null
  type: "SCRAP" | "SALE" | "MELT"
  status: string
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  lineItems: DraftLineItem[]
}

export type CustomerOverrides = {
  scrapGoldPercentageOverride?: number | null
  scrapSilverPercentageOverride?: number | null
  scrapPlatinumPercentageOverride?: number | null
  meltGoldPercentageOverride?: number | null
  meltSilverPercentageOverride?: number | null
  meltPlatinumPercentageOverride?: number | null
  salePremiumPerOzOverride?: number | null
}

export type TransactionPageCustomer = {
  id: string
  fullName: string
  phoneNumber: string
  address: string
  isBusiness: boolean
  businessName: string | null
  isWalkIn: boolean
  detailsSkipped: boolean
}

export type TransactionPageData = {
  customer: TransactionPageCustomer
  scrapDraft: DraftTransaction
  saleDraft: DraftTransaction
  meltDraft: DraftTransaction
  initialPercentages: {
    scrapGold: number
    scrapSilver: number
    scrapPlatinum: number
    meltGold: number
    meltSilver: number
    meltPlatinum: number
  }
  initialSalePremium: number
}

function buildDrafts(todayPrice: { gold: number; silver: number; platinum: number }) {
  const base = {
    id: null as string | null,
    status: "DRAFT",
    goldSpot: todayPrice.gold,
    silverSpot: todayPrice.silver,
    platinumSpot: todayPrice.platinum,
    lineItems: [] as DraftLineItem[],
  }
  return {
    scrapDraft: { ...base, type: "SCRAP" as const },
    saleDraft: { ...base, type: "SALE" as const },
    meltDraft: { ...base, type: "MELT" as const },
  }
}

export async function loadTransactionPageData(
  customerId: string
): Promise<TransactionPageData | { error: "not_found" } | { error: "no_prices" }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [customer, todayPrice, customerWithOverridesRaw] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        address: true,
        isBusiness: true,
        businessName: true,
        isWalkIn: true,
        detailsSkipped: true,
      },
    }),
    prisma.dailyPrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
    }),
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        scrapGoldPercentageOverride: true,
        scrapSilverPercentageOverride: true,
        scrapPlatinumPercentageOverride: true,
        meltGoldPercentageOverride: true,
        meltSilverPercentageOverride: true,
        meltPlatinumPercentageOverride: true,
        salePremiumPerOzOverride: true,
      },
    }) as Promise<CustomerOverrides | null>,
  ])

  if (!customer) {
    return { error: "not_found" }
  }

  if (!todayPrice) {
    return { error: "no_prices" }
  }

  const customerWithOverrides = customerWithOverridesRaw as CustomerOverrides | null
  const drafts = buildDrafts(todayPrice)

  return {
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      isBusiness: customer.isBusiness,
      businessName: customer.businessName,
      isWalkIn: customer.isWalkIn,
      detailsSkipped: customer.detailsSkipped,
    },
    ...drafts,
    initialPercentages: {
      scrapGold: customerWithOverrides?.scrapGoldPercentageOverride ?? todayPrice.scrapGoldPercentage ?? 95,
      scrapSilver: customerWithOverrides?.scrapSilverPercentageOverride ?? todayPrice.scrapSilverPercentage ?? 95,
      scrapPlatinum: customerWithOverrides?.scrapPlatinumPercentageOverride ?? todayPrice.scrapPlatinumPercentage ?? 95,
      meltGold: customerWithOverrides?.meltGoldPercentageOverride ?? todayPrice.meltGoldPercentage ?? 95,
      meltSilver: customerWithOverrides?.meltSilverPercentageOverride ?? todayPrice.meltSilverPercentage ?? 95,
      meltPlatinum: customerWithOverrides?.meltPlatinumPercentageOverride ?? todayPrice.meltPlatinumPercentage ?? 95,
    },
    initialSalePremium: customerWithOverrides?.salePremiumPerOzOverride ?? 0,
  }
}
