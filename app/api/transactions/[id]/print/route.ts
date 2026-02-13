import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id } = await params
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { status: "PRINTED" },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error marking transaction as printed:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

