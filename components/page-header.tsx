import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { LogoutButton } from "./logout-button"
import { UserMenu } from "./user-menu"
import { getSession } from "@/lib/auth"
import { getDisplayName } from "@/lib/utils"

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
    <>
    <header className="dark border-b border-border fixed top-0 left-0 right-0 z-50 bg-background text-foreground">
      <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {showLogo && <Logo size="xl" href="/dashboard" />}
          {title && !showLogo && (
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{title}</h1>
          )}
          {title && showLogo && (
            <span className="text-lg sm:text-xl font-semibold text-muted-foreground hidden sm:inline">|</span>
          )}
          {title && showLogo && (
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-foreground [&_button]:text-foreground [&_button:hover]:bg-accent [&_button:hover]:text-accent-foreground">
          {rightContent}
          {session && (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground font-bold">{getDisplayName(session)}</span>
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
    <div className="h-16 sm:h-20 shrink-0" aria-hidden />
    </>
  )
}

