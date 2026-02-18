import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["OPEN", "PRINTED", "VOID"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    // Delete transaction (line items will be deleted via cascade)
    await prisma.transaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




