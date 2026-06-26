"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { useEffect, useRef } from "react"

interface ActionLink {
  label: string
  href: string
  variant?: "default" | "outline"
  icon?: React.ReactNode
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
        {actions.map((action, index) => (
          <Link key={index} href={action.href} className="block">
            <Button variant={action.variant || "default"} className="w-full group/btn relative overflow-hidden" size="lg">
              <span className="relative z-10 flex items-center justify-center gap-2">
                {action.icon}
                <span className="truncate">{action.label}</span>
                {action.variant !== "outline" && (
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover/btn:translate-x-1" />
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function AdminActionsPanel({ delay = 0 }: { delay?: number }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const links: ActionLink[] = [
    { label: "Daily Prices", href: "/admin/prices", icon: <DollarSign className="h-4 w-4" /> },
    { label: "Reports", href: "/admin/reports", icon: <BarChart3 className="h-4 w-4" /> },
    { label: "Analytics Dashboard", href: "/admin/analytics-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "All Transactions", href: "/admin/transactions", variant: "outline", icon: <Search className="h-4 w-4" /> },
    { label: "Manage Users", href: "/admin/users", variant: "outline", icon: <UserCog className="h-4 w-4" /> },
    { label: "Pending Approvals", href: "/dashboard/approvals", variant: "outline", icon: <ClipboardCheck className="h-4 w-4" /> },
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
            <CardDescription className="mt-1 text-sm">Manage prices, reports, users and approvals</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-6 pt-0">
        {links.map((link, index) => (
          <Link key={index} href={link.href} className="block">
            <Button variant={link.variant || "default"} className="w-full h-11" size="default">
              <span className="flex items-center justify-center gap-2 truncate">
                {link.icon}
                <span className="truncate text-sm">{link.label}</span>
              </span>
            </Button>
          </Link>
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
            { label: "New Customer", href: "/customers/new", variant: "outline", icon: <Plus className="h-4 w-4" /> },
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
            { label: "Walk-in Entry", href: "/walk-in", variant: "outline", icon: <UserPlus className="h-4 w-4" /> },
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
              <Link href="/dashboard/inventory/scrap" className="block">
                <Button className="w-full h-11" size="default">
                  <span className="flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Scrap inventory
                  </span>
                </Button>
              </Link>
              <Link href="/dashboard/inventory/melt" className="block">
                <Button variant="outline" className="w-full h-11" size="default">
                  <span className="flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Melt inventory
                  </span>
                </Button>
              </Link>
              <Link href="/dashboard/inventory/refinery-settlement" className="block">
                <Button variant="outline" className="w-full h-11" size="default">
                  <span className="flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Refinery Settlement
                  </span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
