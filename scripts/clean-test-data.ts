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

async function runCleanup(keepTransactionId: string | null) {
  return prisma.$transaction(async (tx) => {
    const deletedInventory = await tx.inventoryAdjustment.deleteMany()
    const deletedStonesReports = await tx.stonesReport.deleteMany()
    const deletedStonesSaves = await tx.stonesSave.deleteMany()
    const deletedOtps = await tx.passwordResetOTP.deleteMany()
    const deletedTokens = await tx.passwordResetToken.deleteMany()

    const deletedAuditLogs = keepTransactionId
      ? await tx.transactionAuditLog.deleteMany({ where: { transactionId: { not: keepTransactionId } } })
      : await tx.transactionAuditLog.deleteMany()

    const deletedApprovalRequests = keepTransactionId
      ? await tx.transactionApprovalRequest.deleteMany({ where: { transactionId: { not: keepTransactionId } } })
      : await tx.transactionApprovalRequest.deleteMany()

    const deletedLineItems = keepTransactionId
      ? await tx.lineItem.deleteMany({ where: { transactionId: { not: keepTransactionId } } })
      : await tx.lineItem.deleteMany()

    const deletedTransactions = keepTransactionId
      ? await tx.transaction.deleteMany({ where: { id: { not: keepTransactionId } } })
      : await tx.transaction.deleteMany()

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
}

async function main() {
  const mode = process.argv[2] ?? "run"
  const deleteAllTransactions = mode === "preflight-all" || mode === "run-all"
  const isPreflight = mode === "preflight" || mode === "preflight-all"
  const isRun = mode === "run" || mode === "run-all"

  if (!isPreflight && !isRun) {
    console.error("Usage: npx tsx scripts/clean-test-data.ts [preflight|run|preflight-all|run-all]")
    process.exit(1)
  }

  const todayStart = startOfToday()
  const todayEnd = endOfToday()

  console.log("=== Preflight ===")
  console.log(`Mode: ${deleteAllTransactions ? "delete all transactions" : "keep latest today transaction"}`)
  console.log(`Today range (local): ${todayStart.toISOString()} -> ${todayEnd.toISOString()}`)

  const before = await countAll()
  console.log("Before counts:", JSON.stringify(before, null, 2))

  let keepTransactionId: string | null = null

  if (deleteAllTransactions) {
    console.log("Transactions to keep: none (all will be deleted)")
  } else {
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

    keepTransactionId = latestToday.id
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
  }

  if (isPreflight) {
    return
  }

  console.log("\n=== Cleanup ===")

  const result = await runCleanup(keepTransactionId)

  console.log("Deleted:", JSON.stringify(result, null, 2))

  console.log("\n=== Verification ===")
  const after = await countAll()
  console.log("After counts:", JSON.stringify(after, null, 2))

  if (keepTransactionId) {
    const kept = await prisma.transaction.findUnique({
      where: { id: keepTransactionId },
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
  } else {
    console.log("Kept transactions: 0")
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
