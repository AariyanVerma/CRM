import { prisma } from "./db"

export type AuditAction = "STATUS_CHANGE" | "MOVE" | "DELETE"

export async function logTransactionAudit(
  transactionId: string,
  userId: string,
  action: AuditAction,
  oldValue?: object,
  newValue?: object
) {
  await prisma.transactionAuditLog.create({
    data: {
      transactionId,
      userId,
      action,
      oldValue: oldValue != null ? JSON.stringify(oldValue) : null,
      newValue: newValue != null ? JSON.stringify(newValue) : null,
    },
  })
}
