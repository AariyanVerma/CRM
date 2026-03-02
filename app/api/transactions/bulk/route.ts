import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logTransactionAudit } from "@/lib/audit"

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { ids, status } = body as { ids?: string[]; status?: "OPEN" | "PRINTED" | "VOID" }

    if (!Array.isArray(ids) || ids.length === 0 || !status || !["OPEN", "PRINTED", "VOID"].includes(status)) {
      return NextResponse.json(
        { message: "ids (array) and status (OPEN|PRINTED|VOID) are required" },
        { status: 400 }
      )
    }

    const result = await prisma.transaction.updateMany({
      where: { id: { in: ids } },
      data: { status },
    })

    for (const id of ids) {
      try {
        await logTransactionAudit(id, session.id, "STATUS_CHANGE", undefined, { status })
      } catch {

      }
    }

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error("Error bulk updating transactions:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
