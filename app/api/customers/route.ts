import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { phoneNumber: { contains: query, mode: "insensitive" } },
          { businessName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        isBusiness: true,
        businessName: true,
      },
      take: 20,
      orderBy: { fullName: "asc" },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const {
      fullName,
      phoneNumber,
      address,
      isBusiness,
      businessName,
      businessVerificationNotes,
      identityVerificationNotes,
    } = body

    if (!fullName || !phoneNumber || !address) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        fullName,
        phoneNumber,
        address,
        isBusiness: isBusiness || false,
        businessName: isBusiness ? businessName : null,
        businessVerificationNotes: businessVerificationNotes || null,
        identityVerificationNotes: identityVerificationNotes || null,
        identityVerified: false,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

