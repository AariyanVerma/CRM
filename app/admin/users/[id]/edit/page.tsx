import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { EditUserForm } from "@/components/edit-user-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      canIssueCard: true,
      canAccessLockedCards: true,
      firstName: true,
      lastName: true,
      address: true,
      phoneNumber: true,
      profileImageUrl: true,
    },
  })

  if (!user) {
    redirect("/admin/users")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Edit User" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/admin/users" />
          <EditUserForm user={user} />
        </div>
      </main>
    </div>
  )
}

