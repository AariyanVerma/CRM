import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { ProfileForm } from "@/components/profile-form"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Profile" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <ProfileForm user={session} />
        </div>
      </main>
    </div>
  )
}




