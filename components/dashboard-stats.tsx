"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp } from "lucide-react"
import { useEffect, useRef } from "react"

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  gradient: string
  delay?: number
}

function StatCard({ title, value, description, icon, gradient, delay = 0 }: StatCardProps) {
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
      className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl group cursor-pointer transform hover:-translate-y-1"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms, box-shadow 0.5s ease, translate 0.5s ease`,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
          <div className="text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="text-4xl font-extrabold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-1 group-hover:scale-105 transition-transform duration-300">
          {value}
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  title,
  transactionCount,
  totalValue,
  gradient,
}: {
  title: string
  transactionCount: number
  totalValue: number
  gradient: string
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 group transform hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-extrabold mb-1">{transactionCount} transactions</div>
        <p className="text-sm text-muted-foreground font-medium">
          Total: {currencyFormatter.format(totalValue)}
        </p>
      </CardContent>
    </Card>
  )
}

interface DashboardStatsProps {
  customerCount: number
  cardCount: number
  openTransactions: number
  todayTransactionCount?: number
  todayTotalValue?: number
  allTimeTransactionCount?: number
  allTimeTotalValue?: number
  isAdmin?: boolean
}

export function DashboardStats({
  customerCount,
  cardCount,
  openTransactions,
  todayTransactionCount = 0,
  todayTotalValue = 0,
  allTimeTransactionCount = 0,
  allTimeTotalValue = 0,
  isAdmin = false,
}: DashboardStatsProps) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${isAdmin ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-3"}`}>
      <StatCard
        title="Customers"
        value={customerCount}
        description="Total registered customers"
        icon={<Users className="h-6 w-6" />}
        gradient="from-blue-500/20 via-blue-400/10 to-transparent"
        delay={0}
      />

      <StatCard
        title="Active Cards"
        value={cardCount}
        description="NFC cards issued"
        icon={<CreditCard className="h-6 w-6" />}
        gradient="from-purple-500/20 via-purple-400/10 to-transparent"
        delay={100}
      />

      <StatCard
        title="Open Transactions"
        value={openTransactions}
        description="Transactions in progress"
        icon={<TrendingUp className="h-6 w-6" />}
        gradient="from-green-500/20 via-green-400/10 to-transparent"
        delay={200}
      />

      {isAdmin && (
        <>
          <SummaryCard
            title="Today's summary"
            transactionCount={todayTransactionCount}
            totalValue={todayTotalValue}
            gradient="from-amber-500/20 via-amber-400/10 to-transparent"
          />
          <SummaryCard
            title="All-time summary"
            transactionCount={allTimeTransactionCount}
            totalValue={allTimeTotalValue}
            gradient="from-indigo-500/20 via-indigo-400/10 to-transparent"
          />
        </>
      )}
    </div>
  )
}
