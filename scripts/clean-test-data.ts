import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

async function countAll() {
  const [
    users,
    userCards,
    customers,
    membershipCards,
    customerDocuments,
    dailyPrices,
    profileImageUploads,
    transactions,
    lineItems,
    approvalRequests,
    auditLogs,
    inventoryAdjustments,
    stonesSaves,
    stonesSaveRows,
    stonesReports,
    passwordResetOtps,
    passwordResetTokens,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userCard.count(),
    prisma.customer.count(),
    prisma.membershipCard.count(),
    prisma.customerDocument.count(),
    prisma.dailyPrice.count(),
    prisma.profileImageUpload.count(),
    prisma.transaction.count(),
    prisma.lineItem.count(),
    prisma.transactionApprovalRequest.count(),
    prisma.transactionAuditLog.count(),
    prisma.inventoryAdjustment.count(),
    prisma.stonesSave.count(),
    prisma.stonesSaveRow.count(),
    prisma.stonesReport.count(),
    prisma.passwordResetOTP.count(),
    prisma.passwordResetToken.count(),
  ])

  return {
    users,
    userCards,
    customers,
    membershipCards,
    customerDocuments,
    dailyPrices,
    profileImageUploads,
    transactions,
    lineItems,
    approvalRequests,
    auditLogs,
    inventoryAdjustments,
    stonesSaves,
    stonesSaveRows,
    stonesReports,
    passwordResetOtps,
    passwordResetTokens,
  }
}

async function main() {
  const mode = process.argv[2] ?? "run"
  const todayStart = startOfToday()
  const todayEnd = endOfToday()

  console.log("=== Preflight ===")
  console.log(`Today range (local): ${todayStart.toISOString()} -> ${todayEnd.toISOString()}`)

  const before = await countAll()
  console.log("Before counts:", JSON.stringify(before, null, 2))

  const latestToday = await prisma.transaction.findFirst({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { fullName: true } },
      lineItems: true,
    },
  })

  if (!latestToday) {
    console.error("STOP: No transaction found for today. Cleanup aborted per plan.")
    process.exit(1)
  }

  console.log("Keeping latest today transaction:")
  console.log(
    JSON.stringify(
      {
        id: latestToday.id,
        type: latestToday.type,
        status: latestToday.status,
        createdAt: latestToday.createdAt.toISOString(),
        customer: latestToday.customer.fullName,
        lineItemCount: latestToday.lineItems.length,
      },
      null,
      2
    )
  )

  if (mode === "preflight") {
    return
  }

  console.log("\n=== Cleanup ===")

  const result = await prisma.$transaction(async (tx) => {
    const deletedInventory = await tx.inventoryAdjustment.deleteMany()
    const deletedStonesReports = await tx.stonesReport.deleteMany()
    const deletedStonesSaves = await tx.stonesSave.deleteMany()
    const deletedOtps = await tx.passwordResetOTP.deleteMany()
    const deletedTokens = await tx.passwordResetToken.deleteMany()

    const deletedAuditLogs = await tx.transactionAuditLog.deleteMany({
      where: { transactionId: { not: latestToday.id } },
    })

    const deletedApprovalRequests = await tx.transactionApprovalRequest.deleteMany({
      where: { transactionId: { not: latestToday.id } },
    })

    const deletedLineItems = await tx.lineItem.deleteMany({
      where: { transactionId: { not: latestToday.id } },
    })

    const deletedTransactions = await tx.transaction.deleteMany({
      where: { id: { not: latestToday.id } },
    })

    return {
      deletedInventory,
      deletedStonesReports,
      deletedStonesSaves,
      deletedOtps,
      deletedTokens,
      deletedAuditLogs,
      deletedApprovalRequests,
      deletedLineItems,
      deletedTransactions,
    }
  })

  console.log("Deleted:", JSON.stringify(result, null, 2))

  console.log("\n=== Verification ===")
  const after = await countAll()
  console.log("After counts:", JSON.stringify(after, null, 2))

  const kept = await prisma.transaction.findUnique({
    where: { id: latestToday.id },
    include: {
      customer: { select: { fullName: true } },
      lineItems: true,
      createdBy: { select: { email: true, firstName: true, lastName: true } },
    },
  })

  console.log(
    "Kept transaction:",
    JSON.stringify(
      kept
        ? {
            id: kept.id,
            type: kept.type,
            status: kept.status,
            createdAt: kept.createdAt.toISOString(),
            customer: kept.customer.fullName,
            createdBy: kept.createdBy,
            lineItemCount: kept.lineItems.length,
          }
        : null,
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
