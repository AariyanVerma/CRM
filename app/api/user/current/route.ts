import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    )
  }

  return NextResponse.json({ id: session.id, email: session.email, role: session.role })
}






