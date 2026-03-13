import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import dynamic from "next/dynamic"
import { ApprovalReviewSkeleton } from "@/components/skeletons"

const ApprovalReviewClient = dynamic(
  () => import("@/components/approval-review-client").then((m) => ({ default: m.ApprovalReviewClient })),
  { loading: () => <ApprovalReviewSkeleton /> }
)

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/")
  if (session.role !== "ADMIN") redirect("/dashboard")

  const { requestId } = await params
  const request = await prisma.transactionApprovalRequest.findUnique({
    where: { id: requestId },
    include: {
      transaction: { include: { lineItems: true, customer: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!request || request.requestedToUserId !== session.id) {
    notFound()
  }
  const isPending = request.status === "PENDING"
  const isApproved = request.status === "APPROVED"
  const hasGroup = !!request.approvalGroupId
  
  if (!isPending && !isApproved && hasGroup) {
    const pendingInGroup = await prisma.transactionApprovalRequest.findFirst({
      where: { approvalGroupId: request.approvalGroupId, requestedToUserId: session.id, status: "PENDING" },
    })
    if (!pendingInGroup) {
      const approvedInGroup = await prisma.transactionApprovalRequest.findFirst({
        where: { approvalGroupId: request.approvalGroupId, requestedToUserId: session.id, status: "APPROVED" },
      })
      if (!approvedInGroup) notFound()
    }
  } else if (!isPending && !isApproved) {
    notFound()
  }

  const customerId = request.transaction.customerId
  const reqTx = request.transaction
  let scrapTx: typeof reqTx | null = null
  let meltTx: typeof reqTx | null = null
  let scrapRequestId: string | null = null
  let meltRequestId: string | null = null
  let scrapRequestApproved = false
  let meltRequestApproved = false

  if (request.approvalGroupId) {
    const groupRequests = await prisma.transactionApprovalRequest.findMany({
      where: { approvalGroupId: request.approvalGroupId, requestedToUserId: session.id },
      include: {
        transaction: { include: { lineItems: true, customer: true } },
        requestedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })
    for (const r of groupRequests) {
      if (r.transaction.type === "SCRAP") {
        scrapTx = r.transaction
        if (r.status === "PENDING") scrapRequestId = r.id
        if (r.status === "APPROVED") scrapRequestApproved = true
      } else {
        meltTx = r.transaction
        if (r.status === "PENDING") meltRequestId = r.id
        if (r.status === "APPROVED") meltRequestApproved = true
      }
    }
  }

  if (!scrapTx && !meltTx) {
    scrapTx = reqTx.type === "SCRAP" ? reqTx : null
    meltTx = reqTx.type === "MELT" ? reqTx : null
    if (reqTx.type === "SCRAP") {
      scrapRequestId = requestId
      if (isApproved) scrapRequestApproved = true
    } else {
      meltRequestId = requestId
      if (isApproved) meltRequestApproved = true
    }
    if (!scrapTx) {
      scrapTx = await prisma.transaction.findFirst({
        where: { customerId, type: "SCRAP", status: { in: ["OPEN", "PENDING_APPROVAL", "APPROVED"] } },
        include: { lineItems: true, customer: true },
      })
    }
    if (!meltTx) {
      meltTx = await prisma.transaction.findFirst({
        where: { customerId, type: "MELT", status: { in: ["OPEN", "PENDING_APPROVAL", "APPROVED"] } },
        include: { lineItems: true, customer: true },
      })
    }
  }
  
  if (!request.approvalGroupId && isApproved) {
    if (reqTx.type === "SCRAP") scrapRequestApproved = true
    else meltRequestApproved = true
  }

  const scrapFallback = {
    id: "dummy-scrap",
    type: "SCRAP" as const,
    status: "OPEN",
    goldSpot: reqTx.goldSpot,
    silverSpot: reqTx.silverSpot,
    platinumSpot: reqTx.platinumSpot,
    lineItems: [] as typeof reqTx.lineItems,
  }
  const meltFallback = {
    id: "dummy-melt",
    type: "MELT" as const,
    status: "OPEN",
    goldSpot: reqTx.goldSpot,
    silverSpot: reqTx.silverSpot,
    platinumSpot: reqTx.platinumSpot,
    lineItems: [] as typeof reqTx.lineItems,
  }
  const scrapForReview = scrapTx ?? scrapFallback
  const meltForReview = meltTx ?? meltFallback

  const customer = (scrapTx?.customer ?? meltTx?.customer ?? request.transaction.customer) as { id: string; fullName: string; phoneNumber: string; address: string; isBusiness: boolean; businessName: string | null }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Review transaction" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 flex-1" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <BackButton className="mb-4" />
        <ApprovalReviewClient
          requestId={requestId}
          scrapRequestId={scrapRequestId}
          meltRequestId={meltRequestId}
          scrapRequestApproved={scrapRequestApproved}
          meltRequestApproved={meltRequestApproved}
          customer={customer}
          scrapTransaction={scrapForReview as any}
          meltTransaction={meltForReview as any}
          staffName={[request.requestedBy.firstName, request.requestedBy.lastName].filter(Boolean).join(" ") || request.requestedBy.email}
        />
      </main>
    </div>
  )
}
