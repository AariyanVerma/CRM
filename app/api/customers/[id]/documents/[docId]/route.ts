import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAuth()
    const { id: customerId, docId } = await params
    const inline = request.nextUrl.searchParams.get("inline") === "1"

    const doc = await prisma.customerDocument.findFirst({
      where: { id: docId, customerId },
    })

    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 })
    }

    const buffer = Buffer.from(doc.data)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": inline
          ? `inline; filename="${encodeURIComponent(doc.name)}"`
          : `attachment; filename="${encodeURIComponent(doc.name)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    console.error("Error downloading customer document:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unauthorized" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAdmin()
    const { id: customerId, docId } = await params

    const doc = await prisma.customerDocument.findFirst({
      where: { id: docId, customerId },
    })

    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 })
    }

    await prisma.customerDocument.delete({ where: { id: docId } })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Error deleting customer document:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unauthorized" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    )
  }
}
