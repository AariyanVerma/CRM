import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { StonesReportPeriod } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const periodType = searchParams.get("periodType") as StonesReportPeriod | null
    const saves = await prisma.stonesReport.findMany({
      where: periodType ? { periodType } : undefined,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(saves)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()
    const { periodType, periodStart, periodEnd, totalPaid, grandTotal, selectedRowIds, selectedRowsData } = body
    const profit = Number(grandTotal) - Number(totalPaid)
    const report = await prisma.stonesReport.create({
      data: {
        periodType: periodType as StonesReportPeriod,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        totalPaid: Number(totalPaid) || 0,
        grandTotal: Number(grandTotal) || 0,
        profit,
        selectedRowIds: Array.isArray(selectedRowIds) ? JSON.stringify(selectedRowIds) : selectedRowIds ?? null,
        selectedRowsData: Array.isArray(selectedRowsData) ? selectedRowsData : selectedRowsData ?? null,
      },
    })
    return NextResponse.json(report)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: "Failed to save report" }, { status: 500 })
  }
}
