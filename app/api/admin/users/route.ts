import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        canIssueCard: true,
        firstName: true,
        lastName: true,
        address: true,
        phoneNumber: true,
        profileImageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { email, password, role, canIssueCard, firstName, lastName, address, phoneNumber, profileImageUrl } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists (case-insensitive)
    const normalizedEmail = email.toLowerCase().trim()
    const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail}) LIMIT 1
    `
    
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Store email in lowercase for consistency
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail, // Store normalized email
        passwordHash,
        role: role || "STAFF",
        canIssueCard: canIssueCard === true,
        firstName: firstName || null,
        lastName: lastName || null,
        address: address || null,
        phoneNumber: phoneNumber || null,
        profileImageUrl: profileImageUrl || null,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      canIssueCard: user.canIssueCard,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

