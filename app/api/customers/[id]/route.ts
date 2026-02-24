import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    
    // Only admins can edit customers
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      fullName,
      phoneNumber,
      address,
      isBusiness,
      businessName,
      businessVerificationNotes,
      identityVerificationNotes,
      identityVerified,
    } = body

    if (!fullName || !phoneNumber || !address) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        fullName,
        phoneNumber,
        address,
        isBusiness: isBusiness || false,
        businessName: isBusiness ? businessName : null,
        businessVerificationNotes: businessVerificationNotes || null,
        identityVerificationNotes: identityVerificationNotes || null,
        identityVerified: identityVerified || false,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}


