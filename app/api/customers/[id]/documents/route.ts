import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: customerId } = await params

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 })
    }

    const documents = await prisma.customerDocument.findMany({
      where: { customerId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error listing customer documents:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unauthorized" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id: customerId } = await params

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll("file") as File[]

    if (!files.length) {
      return NextResponse.json({ message: "No file(s) provided" }, { status: 400 })
    }

    const created: Array<{ id: string; name: string }> = []

    for (const file of files) {
      if (!file || typeof file.size !== "number") continue

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        )
      }

      if (!ALLOWED_MIMES.includes(file.type)) {
        return NextResponse.json(
          { message: `File type not allowed: ${file.name} (${file.type})` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const data = Buffer.from(bytes)

      const doc = await prisma.customerDocument.create({
        data: {
          customerId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data,
          uploadedBy: session.id,
        },
      })
      created.push({ id: doc.id, name: doc.name })
    }

    return NextResponse.json({ created })
  } catch (error) {
    console.error("Error uploading customer document:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unauthorized" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    )
  }
}
