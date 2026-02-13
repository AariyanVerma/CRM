import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default admin user
  const adminEmail = 'admin@example.com'
  const adminPassword = 'admin123'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log('Created admin user:', admin.email)
    console.log('Password:', adminPassword)
  } else {
    console.log('Admin user already exists')
  }

  // Create default staff user
  const staffEmail = 'staff@example.com'
  const staffPassword = 'staff123'

  const existingStaff = await prisma.user.findUnique({
    where: { email: staffEmail },
  })

  if (!existingStaff) {
    const passwordHash = await bcrypt.hash(staffPassword, 10)
    const staff = await prisma.user.create({
      data: {
        email: staffEmail,
        passwordHash,
        role: 'STAFF',
      },
    })
    console.log('Created staff user:', staff.email)
    console.log('Password:', staffPassword)
  } else {
    console.log('Staff user already exists')
  }

  // Create sample daily prices for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingPrice = await prisma.dailyPrice.findUnique({
    where: { date: today },
  })

  if (!existingPrice) {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (admin) {
      await prisma.dailyPrice.create({
        data: {
          date: today,
          gold: 2000.0,
          silver: 25.0,
          platinum: 1000.0,
          createdByUserId: admin.id,
        },
      })
      console.log('Created sample daily prices')
    }
  } else {
    console.log('Daily prices already exist for today')
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

