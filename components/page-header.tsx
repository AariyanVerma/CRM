import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { LogoutButton } from "./logout-button"
import { UserMenu } from "./user-menu"
import { getSession } from "@/lib/auth"

interface PageHeaderProps {
  title?: string
  showLogo?: boolean
  rightContent?: React.ReactNode
}

export async function PageHeader({ 
  title, 
  showLogo = true,
  rightContent 
}: PageHeaderProps) {
  const session = await getSession()

  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {showLogo && <Logo size="xl" href="/dashboard" />}
          {title && !showLogo && (
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{title}</h1>
          )}
          {title && showLogo && (
            <span className="text-lg sm:text-xl font-semibold text-muted-foreground hidden sm:inline">|</span>
          )}
          {title && showLogo && (
            <h1 className="text-base sm:text-lg md:text-xl font-semibold">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {rightContent}
          {session && (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">{session.email}</span>
              <UserMenu
                email={session.email}
                role={session.role}
                firstName={session.firstName}
                lastName={session.lastName}
                address={session.address}
                phoneNumber={session.phoneNumber}
                profileImageUrl={session.profileImageUrl}
              />
            </>
          )}
          <ThemeToggle />
          {session && <LogoutButton />}
        </div>
      </div>
    </header>
  )
}

