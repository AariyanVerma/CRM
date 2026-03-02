import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json(
        { message: "No image file provided" },
        { status: 400 }
      )
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "File must be an image" },
        { status: 400 }
      )
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Image size must be less than 5MB" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadsDir = join(process.cwd(), "public", "uploads", "profiles")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)
    const url = `/uploads/profiles/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




