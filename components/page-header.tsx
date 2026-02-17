import { Logo } from "./logo"
import { ThemeToggle } from "./theme-toggle"
import { LogoutButton } from "./logout-button"

interface PageHeaderProps {
  title?: string
  showLogo?: boolean
  rightContent?: React.ReactNode
}

export function PageHeader({ 
  title, 
  showLogo = true,
  rightContent 
}: PageHeaderProps) {
  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {showLogo && <Logo size="xl" />}
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
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

