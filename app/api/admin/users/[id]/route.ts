import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      address,
      phoneNumber,
      profileImageUrl,
    } = body

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (firstName !== undefined) updateData.firstName = firstName || null
    if (lastName !== undefined) updateData.lastName = lastName || null
    if (address !== undefined) updateData.address = address || null
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl || null

    // Update password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    // Check email uniqueness if email is being changed (case-insensitive)
    if (email && email.toLowerCase().trim() !== existing.email.toLowerCase().trim()) {
      const normalizedEmail = email.toLowerCase().trim()
      const emailExists = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail}) LIMIT 1
      `
      if (emailExists.length > 0) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 400 }
        )
      }
      // Normalize email before storing
      updateData.email = normalizedEmail
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const session = await requireAdmin()

    // Prevent admin from deleting themselves
    if (id === session.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

