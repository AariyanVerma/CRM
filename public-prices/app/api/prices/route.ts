import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const base = (process.env.CRM_API_URL || "").replace(/\/$/, "")
  if (!base) {
    return NextResponse.json({ message: "CRM_API_URL is not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(`${base}/api/public/daily-prices`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { message: (data as { message?: string }).message || "Failed to load prices" },
        { status: res.status }
      )
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch {
    return NextResponse.json({ message: "Unable to reach price API" }, { status: 502 })
  }
}
