import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { message: "Customer ID is required" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      )
    }

    // Update transaction customer
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { customerId },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error moving transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




