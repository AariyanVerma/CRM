import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    const admin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
      },
    })

    if (!admin) {
      console.error("No admin user found!")
      process.exit(1)
    }
    const newPassword = "admin123"
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash },
    })

    console.log("✅ Admin password reset successfully!")
    console.log(`Email: ${admin.email}`)
    console.log(`New password: ${newPassword}`)
    console.log("\n⚠️  IMPORTANT: Change this password after logging in!")
    console.log("⚠️  Delete this script after use for security!")
  } catch (error) {
    console.error("Error resetting password:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()




