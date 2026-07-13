"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Users,
  Plus,
  ScanLine,
  DollarSign,
  UserCog,
  ArrowRight,
  BarChart3,
  Search,
  LayoutDashboard,
  Gem,
  ClipboardCheck,
  UserPlus,
  TrendingUp,
} from "lucide-react"
import { useEffect, useRef } from "react"

const actionButtonClass =
  "border-0 bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground"

interface ActionLink {
  label: string
  href: string
  icon?: React.ReactNode
}

interface ActionButtonProps extends ActionLink {
  size?: "default" | "lg"
}

function ActionButton({ label, href, icon, size = "lg" }: ActionButtonProps) {
  return (
    <Link href={href} className="block">
      <Button
        className={cn("w-full group/btn", actionButtonClass, size === "default" ? "h-11" : "")}
        size={size}
      >
        <span className="flex items-center justify-center gap-2">
          {icon}
          <span className="truncate">{label}</span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover/btn:translate-x-1" />
        </span>
      </Button>
    </Link>
  )
}

interface ActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
  actions: ActionLink[]
  delay?: number
}

function ActionCard({ title, description, icon, gradient, actions, delay = 0 }: ActionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            setTimeout(() => {
              element.style.opacity = "1"
              element.style.transform = "translateY(0) scale(1)"
            }, delay)
            observer.unobserve(element)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <Card
      ref={cardRef}
      className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl group transform hover:-translate-y-1 w-full h-full flex flex-col"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms, box-shadow 0.5s ease, translate 0.5s ease`,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl -translate-y-20 translate-x-20 group-hover:scale-150 transition-transform duration-700" />

      <CardHeader className="relative z-10 shrink-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
            <div className="text-blue-600 dark:text-blue-400">{icon}</div>
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold leading-tight">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm leading-snug line-clamp-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 mt-auto flex flex-col gap-2.5 pb-6 pt-0">
        {actions.map((action) => (
          <ActionButton key={action.href} {...action} />
        ))}
      </CardContent>
    </Card>
  )
}

function AdminActionsPanel({ delay = 0 }: { delay?: number }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const links: ActionLink[] = [
    { label: "Daily Prices", href: "/admin/prices", icon: <DollarSign className="h-4 w-4" /> },
    { label: "Price History", href: "/admin/price-history", icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Reports", href: "/admin/reports", icon: <BarChart3 className="h-4 w-4" /> },
    { label: "Analytics Dashboard", href: "/admin/analytics-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "All Transactions", href: "/admin/transactions", icon: <Search className="h-4 w-4" /> },
    { label: "Manage Users", href: "/admin/users", icon: <UserCog className="h-4 w-4" /> },
    { label: "Pending Approvals", href: "/dashboard/approvals", icon: <ClipboardCheck className="h-4 w-4" /> },
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            setTimeout(() => {
              element.style.opacity = "1"
              element.style.transform = "translateY(0)"
            }, delay)
            observer.unobserve(element)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <Card
      ref={cardRef}
      className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl group w-full"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-lg">
            <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Admin Panel</CardTitle>
            <CardDescription className="mt-1 text-sm">Manage prices, history, reports, users and approvals</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-6 pt-0">
        {links.map((link) => (
          <ActionButton key={link.href} {...link} size="default" />
        ))}
      </CardContent>
    </Card>
  )
}

interface DashboardActionsProps {
  isAdmin: boolean
}

export function DashboardActions({ isAdmin }: DashboardActionsProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        <ActionCard
          title="Customers"
          description="Manage customer records and issue NFC cards"
          icon={<Users className="h-6 w-6" />}
          gradient="from-blue-500/20 via-indigo-500/10 to-transparent"
          actions={[
            { label: "View All Customers", href: "/customers", icon: <Users className="h-4 w-4" /> },
            { label: "New Customer", href: "/customers/new", icon: <Plus className="h-4 w-4" /> },
          ]}
          delay={0}
        />

        <ActionCard
          title="Scan Card"
          description="Start a transaction by scanning an NFC card or for a walk-in customer"
          icon={<ScanLine className="h-6 w-6" />}
          gradient="from-green-500/20 via-emerald-500/10 to-transparent"
          actions={[
            { label: "Scan Entry", href: "/scan", icon: <ScanLine className="h-4 w-4" /> },
            { label: "Walk-in Entry", href: "/walk-in", icon: <UserPlus className="h-4 w-4" /> },
          ]}
          delay={100}
        />

        {isAdmin && (
          <ActionCard
            title="Stones Table"
            description="Record stone purchases by metal, purity, DWT and price paid"
            icon={<Gem className="h-6 w-6" />}
            gradient="from-amber-500/20 via-yellow-500/10 to-transparent"
            actions={[
              { label: "Go to Stones Table", href: "/dashboard/stones-table", icon: <Gem className="h-4 w-4" /> },
            ]}
            delay={200}
          />
        )}
      </div>

      {isAdmin && (
        <>
          <AdminActionsPanel delay={300} />

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl group w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-lg">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Inventory</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Track accumulated scrap and melt inventory by metal, purity and weight
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6 pt-0">
              <ActionButton label="Scrap inventory" href="/dashboard/inventory/scrap" icon={<DollarSign className="h-4 w-4" />} size="default" />
              <ActionButton label="Melt inventory" href="/dashboard/inventory/melt" icon={<DollarSign className="h-4 w-4" />} size="default" />
              <ActionButton label="Refinery Settlement" href="/dashboard/inventory/refinery-settlement" icon={<DollarSign className="h-4 w-4" />} size="default" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
