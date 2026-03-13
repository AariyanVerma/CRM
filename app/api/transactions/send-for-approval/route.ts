import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"
import {
  calculateScrapGoldPricePerDWT,
  calculateScrapSilverPricePerDWT,
  calculateScrapPlatinumPricePerDWT,
  calculateMeltGoldPricePerDWT,
  calculateMeltSilverPricePerDWT,
  calculateMeltPlatinumPricePerDWT,
  calculateLineTotal,
} from "@/lib/pricing"

type LineItemInput = {
  metalType: string
  purityLabel: string
  dwt: number
  purityPercentage?: number | null
  pricePerOz?: number
  lineTotal?: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.role !== "STAFF") {
      return NextResponse.json({ message: "Only staff can send for approval" }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, type, lineItems, requestedToUserId, approvalGroupId: existingGroupId } = body as {
      customerId?: string
      type?: "SCRAP" | "MELT"
      lineItems?: LineItemInput[]
      requestedToUserId?: string
      approvalGroupId?: string
    }

    if (!customerId || !type || !Array.isArray(lineItems) || !requestedToUserId) {
      return NextResponse.json(
        { message: "customerId, type, lineItems (array), and requestedToUserId required" },
        { status: 400 }
      )
    }

    const admin = await prisma.user.findFirst({
      where: { id: requestedToUserId, role: "ADMIN" },
    })
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayPrice = await prisma.dailyPrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
    })
    if (!todayPrice) {
      return NextResponse.json({ message: "No prices set for today" }, { status: 400 })
    }

    const goldSpot = todayPrice.gold
    const silverSpot = todayPrice.silver
    const platinumSpot = todayPrice.platinum

    const transaction = await prisma.transaction.create({
      data: {
        customerId,
        createdByUserId: session.id,
        type,
        status: "PENDING_APPROVAL",
        goldSpot,
        silverSpot,
        platinumSpot,
      },
    })

    const createdLineItems: { id: string; metalType: string; purityLabel: string; dwt: number; pricePerOz: number; lineTotal: number; purityPercentage?: number | null }[] = []

    for (const item of lineItems) {
      const { metalType, purityLabel, dwt: rawDwt, purityPercentage: rawPct, pricePerOz, lineTotal: clientLineTotal } = item
      const parsedDwt = parseFloat(String(rawDwt)) || 0
      if (type === "SCRAP" && parsedDwt <= 0) continue
      if (!metalType || !purityLabel) continue

      
      
      let pricePerDWT: number
      let lineTotal: number

      if (typeof pricePerOz === "number" && !Number.isNaN(pricePerOz) && pricePerOz > 0 && typeof clientLineTotal === "number" && !Number.isNaN(clientLineTotal) && clientLineTotal >= 0) {
        pricePerDWT = pricePerOz
        lineTotal = clientLineTotal
      } else {
        const percentageKey = `${type.toLowerCase()}${metalType.charAt(0) + metalType.slice(1).toLowerCase()}Percentage` as keyof typeof todayPrice
        const percentage = (todayPrice[percentageKey] as number) ?? 95

        pricePerDWT = 0
        if (type === "SCRAP") {
          if (metalType === "GOLD") {
            pricePerDWT = calculateScrapGoldPricePerDWT(purityLabel as any, goldSpot, percentage)
          } else if (metalType === "SILVER") {
            pricePerDWT = calculateScrapSilverPricePerDWT(purityLabel as any, silverSpot, percentage)
          } else if (metalType === "PLATINUM") {
            pricePerDWT = calculateScrapPlatinumPricePerDWT(purityLabel as any, platinumSpot, percentage)
          }
        } else {
          const purityPct = rawPct != null ? parseFloat(String(rawPct)) || 0 : 0
          if (metalType === "GOLD") {
            pricePerDWT = calculateMeltGoldPricePerDWT(goldSpot, purityPct, parsedDwt, percentage)
          } else if (metalType === "SILVER") {
            pricePerDWT = calculateMeltSilverPricePerDWT(silverSpot, purityPct, parsedDwt, percentage)
          } else if (metalType === "PLATINUM") {
            pricePerDWT = calculateMeltPlatinumPricePerDWT(platinumSpot, purityPct, parsedDwt, percentage)
          }
        }

        lineTotal = type === "MELT" ? pricePerDWT : calculateLineTotal(pricePerDWT, parsedDwt)
      }
      const purityPct = type === "MELT" && rawPct != null ? parseFloat(String(rawPct)) || 0 : null

      const created = await prisma.lineItem.create({
        data: {
          transactionId: transaction.id,
          metalType: metalType as "GOLD" | "SILVER" | "PLATINUM",
          purityLabel,
          dwt: parsedDwt,
          pricePerOz: pricePerDWT,
          lineTotal,
          ...(type === "MELT" && purityPct !== null ? { purityPercentage: purityPct } : {}),
        },
      })
      createdLineItems.push({
        id: created.id,
        metalType: created.metalType,
        purityLabel: created.purityLabel,
        dwt: created.dwt,
        pricePerOz: created.pricePerOz,
        lineTotal: created.lineTotal,
        purityPercentage: created.purityPercentage ?? null,
      })
    }

    const approvalGroupId = existingGroupId ?? crypto.randomUUID()
    const approvalRequest = await prisma.transactionApprovalRequest.create({
      data: {
        transactionId: transaction.id,
        requestedByUserId: session.id,
        requestedToUserId: admin.id,
        status: "PENDING",
        approvalGroupId,
      },
      include: {
        requestedTo: { select: { firstName: true, lastName: true, email: true } },
        transaction: { select: { id: true, type: true } },
      },
    })

    try {
      const io = getIO()
      io.to(`admin:${admin.id}`).emit("approval_request_new", {
        requestId: approvalRequest.id,
        transactionId: transaction.id,
        transactionType: type,
        requestedBy: session.id,
      })
    } catch (e) {
      console.error("Error emitting approval request:", e)
    }

    return NextResponse.json({
      transaction: { ...transaction, lineItems: createdLineItems },
      approvalRequest,
      approvalGroupId,
    })
  } catch (error) {
    console.error("Error sending for approval:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
