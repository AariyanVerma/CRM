import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const MIME_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const row = await prisma.profileImageUpload.findUnique({
      where: { id },
    })
    if (!row || !row.data) {
      return new NextResponse(null, { status: 404 })
    }
    const mimeType = MIME_TYPES[row.mimeType] || row.mimeType || "image/jpeg"
    const body = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as ArrayBuffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
