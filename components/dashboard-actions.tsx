"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, Plus, ScanLine, DollarSign, UserCog, ArrowRight, BarChart3, Search, LayoutDashboard } from "lucide-react"
import { useEffect, useRef } from "react"

interface ActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
  actions: Array<{
    label: string
    href: string
    variant?: "default" | "outline"
    icon?: React.ReactNode
  }>
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
      className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl group transform hover:-translate-y-2"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms, box-shadow 0.5s ease, translate 0.5s ease`,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl -translate-y-20 translate-x-20 group-hover:scale-150 transition-transform duration-700" />
      
      <CardHeader className="relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
            <div className="text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          </div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </div>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 relative z-10">
        {actions.map((action, index) => (
          <Link key={index} href={action.href} className="block">
            <Button
              variant={action.variant || "default"}
              className="w-full group/btn relative overflow-hidden"
              size="lg"
            >
              <span className="relative z-10 flex items-center justify-center">
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
                {action.variant !== "outline" && (
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
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

interface DashboardActionsProps {
  isAdmin: boolean
}

export function DashboardActions({ isAdmin }: DashboardActionsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <ActionCard
        title="Customers"
        description="Manage customer records and issue NFC cards"
        icon={<Users className="h-7 w-7" />}
        gradient="from-blue-500/20 via-indigo-500/10 to-transparent"
        actions={[
          {
            label: "View All Customers",
            href: "/customers",
            icon: <ArrowRight className="h-4 w-4" />,
          },
          {
            label: "New Customer",
            href: "/customers/new",
            variant: "outline",
            icon: <Plus className="h-4 w-4" />,
          },
        ]}
        delay={0}
      />

      <ActionCard
        title="Scan Card"
        description="Start a transaction by scanning an NFC card"
        icon={<ScanLine className="h-7 w-7" />}
        gradient="from-green-500/20 via-emerald-500/10 to-transparent"
        actions={[
          {
            label: "Scan Entry",
            href: "/scan",
            icon: <ScanLine className="h-4 w-4" />,
          },
        ]}
        delay={100}
      />

      {isAdmin && (
        <ActionCard
          title="Admin Panel"
          description="Manage prices and system settings"
          icon={<UserCog className="h-7 w-7" />}
          gradient="from-purple-500/20 via-pink-500/10 to-transparent"
          actions={[
            {
              label: "Daily Prices",
              href: "/admin/prices",
              icon: <DollarSign className="h-4 w-4" />,
            },
            {
              label: "Reports",
              href: "/admin/reports",
              icon: <BarChart3 className="h-4 w-4" />,
            },
            {
              label: "Analytics Dashboard",
              href: "/admin/analytics-dashboard",
              icon: <LayoutDashboard className="h-4 w-4" />,
            },
            {
              label: "All Transactions",
              href: "/admin/transactions",
              variant: "outline",
              icon: <Search className="h-4 w-4" />,
            },
            {
              label: "Manage Users",
              href: "/admin/users",
              variant: "outline",
              icon: <UserCog className="h-4 w-4" />,
            },
          ]}
          delay={200}
        />
      )}
    </div>
  )
}

