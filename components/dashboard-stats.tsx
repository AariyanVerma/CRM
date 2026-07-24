"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp, CalendarDays, History, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatCurrency, emptyTypeTotals, type TransactionTypeTotals } from "@/lib/transaction-totals"

const statCardShell = "flex-1 min-w-[min(100%,11.5rem)] h-44 shrink-0"
const WIDE_CARD_MIN_PX = 280
const STACKED_LAYOUT_MAX_PX = 520
const WIDE_CHIP_ROW_MIN_PX = 560

type ChipVariant = "grid" | "rows"
type ChipScale = "sm" | "md" | "lg" | "xl"

const chipScaleStyles = {
  sm: {
    pad: "px-2 py-1.5",
    padRows: "px-2 py-2",
    label: "text-[9px] font-bold",
    amount: "text-[10px] font-bold",
    totalLabel: "text-[9px] font-bold",
    totalAmount: "text-[10px] font-extrabold",
  },
  md: {
    pad: "px-2 py-1.5",
    padRows: "px-2.5 py-2",
    label: "text-[10px] font-extrabold",
    amount: "text-xs font-extrabold",
    totalLabel: "text-[10px] font-extrabold",
    totalAmount: "text-sm font-black",
  },
  lg: {
    pad: "px-2.5 py-2",
    padRows: "px-3 py-2.5",
    label: "text-[11px] font-extrabold",
    amount: "text-sm font-black",
    totalLabel: "text-[11px] font-extrabold",
    totalAmount: "text-base font-black",
  },
  xl: {
    pad: "px-3 py-2",
    padRows: "px-3.5 py-3",
    label: "text-xs font-black",
    amount: "text-base font-black",
    totalLabel: "text-xs font-black",
    totalAmount: "text-lg font-black",
  },
} as const

function getChipScale(width: number): ChipScale {
  if (width >= 540) return "xl"
  if (width >= 440) return "lg"
  if (width >= 360) return "md"
  return "sm"
}

function FitAmount({ text, className, inset = true }: { text: string; className?: string; inset?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const fit = () => {
      textEl.style.transform = "scale(1)"
      const available = container.clientWidth
      const needed = textEl.scrollWidth
      if (needed <= 0 || available <= 0) return
      const scale = Math.min(1, (available - 2) / needed)
      textEl.style.transform = `scale(${scale})`
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={cn("flex w-full min-w-0 justify-center overflow-hidden", inset && "mt-1")}>
      <span ref={textRef} className={cn("inline-block origin-center whitespace-nowrap tabular-nums", className)}>
        {text}
      </span>
    </div>
  )
}

function CompactTypeChip({
  label,
  amount,
  tone,
  variant,
  scale,
  expandable,
  expanded,
  onToggle,
}: {
  label: string
  amount: number
  tone: "scrap" | "sale" | "melt"
  variant: ChipVariant
  scale: ChipScale
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  const styles = chipScaleStyles[scale]
  const formatted = formatCurrency(amount)
  const shell =
    tone === "scrap"
      ? "border-blue-500/20 bg-blue-500/10"
      : tone === "sale"
        ? "border-violet-500/20 bg-violet-500/10"
        : "border-rose-500/20 bg-rose-500/10"
  const labelClass =
    tone === "scrap"
      ? "text-blue-700 dark:text-blue-300"
      : tone === "sale"
        ? "text-violet-700 dark:text-violet-300"
        : "text-rose-700 dark:text-rose-300"

  const className = cn(
    "flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border text-center",
    variant === "rows" ? styles.padRows : styles.pad,
    shell,
    expandable && "cursor-pointer transition hover:brightness-95",
    expandable && expanded && "ring-1 ring-primary/30"
  )

  const body = (
    <>
      <span className={cn("inline-flex w-full min-w-0 items-center justify-center gap-0.5 truncate uppercase tracking-[0.08em] leading-none", styles.label, labelClass)}>
        {label}
        {expandable ? (
          <ChevronDown
            className={cn("h-3 w-3 shrink-0 opacity-70 transition-transform duration-200", expanded && "rotate-180")}
            aria-hidden
          />
        ) : null}
      </span>
      <FitAmount text={formatted} className={cn("font-extrabold text-foreground", styles.amount)} />
    </>
  )

  if (expandable) {
    return (
      <button type="button" onClick={onToggle} aria-expanded={expanded} className={className}>
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}

function MetalBreakdownRow({
  breakdown,
}: {
  breakdown: TransactionTypeTotals["scrapByMetal"]
  tone?: "scrap" | "melt"
}) {
  const metals = [
    {
      label: "Gold",
      amount: breakdown.gold,
      shell: "border-amber-400/40 bg-gradient-to-br from-amber-50 to-amber-100/70 dark:from-amber-500/15 dark:to-amber-500/5",
      labelClass: "text-amber-800 dark:text-amber-300",
      amountClass: "text-amber-950 dark:text-amber-100",
      dot: "bg-amber-500",
    },
    {
      label: "Silver",
      amount: breakdown.silver,
      shell: "border-slate-400/40 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-500/15 dark:to-slate-500/5",
      labelClass: "text-slate-600 dark:text-slate-300",
      amountClass: "text-slate-900 dark:text-slate-100",
      dot: "bg-slate-500",
    },
    {
      label: "Platinum",
      amount: breakdown.platinum,
      shell: "border-sky-400/40 bg-gradient-to-br from-sky-50 to-sky-100/70 dark:from-sky-500/15 dark:to-sky-500/5",
      labelClass: "text-sky-700 dark:text-sky-300",
      amountClass: "text-sky-950 dark:text-sky-100",
      dot: "bg-sky-500",
    },
  ]

  return (
    <div className="mt-2 grid animate-in fade-in-0 slide-in-from-top-1 duration-200 grid-cols-3 gap-1.5">
      {metals.map((metal) => (
        <div key={metal.label} className={cn("min-w-0 rounded-lg border px-1.5 py-1.5 text-center shadow-sm", metal.shell)}>
          <div className="flex items-center justify-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", metal.dot)} aria-hidden />
            <p className={cn("truncate text-[9px] font-bold uppercase tracking-[0.1em]", metal.labelClass)}>{metal.label}</p>
          </div>
          <p className={cn("mt-1 truncate text-[10px] font-extrabold tabular-nums", metal.amountClass)}>
            {formatCurrency(metal.amount)}
          </p>
        </div>
      ))}
    </div>
  )
}

function CompactTotalChip({
  amount,
  variant,
  scale,
}: {
  amount: number
  variant: ChipVariant
  scale: ChipScale
}) {
  const styles = chipScaleStyles[scale]
  const formatted = formatCurrency(amount)

  if (variant === "rows") {
    return (
      <div
        className={cn(
          "flex h-full w-full min-h-0 min-w-0 flex-row items-center justify-between gap-2 overflow-hidden rounded-md border border-primary/30 bg-primary text-primary-foreground shadow-sm shadow-primary/15",
          styles.padRows
        )}
      >
        <span className={cn("shrink-0 uppercase tracking-[0.1em] text-primary-foreground/90", styles.totalLabel)}>
          Total
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end overflow-hidden">
          <FitAmount text={formatted} inset={false} className={cn("font-black text-primary-foreground", styles.totalAmount)} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border border-primary/30 bg-primary text-center text-primary-foreground shadow-sm shadow-primary/15",
        styles.pad
      )}
    >
      <span className={cn("w-full min-w-0 truncate uppercase tracking-[0.08em] leading-none text-primary-foreground/85", styles.totalLabel)}>
        Total
      </span>
      <FitAmount text={formatted} className={cn("font-black text-primary-foreground", styles.totalAmount)} />
    </div>
  )
}

function useCardChipLayout(ref: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<{
    layout: "hidden" | ChipVariant
    scale: ChipScale
    stacked: boolean
  }>({
    layout: "hidden",
    scale: "sm",
    stacked: false,
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      const scale = getChipScale(width)
      const stacked = width < STACKED_LAYOUT_MAX_PX

      if (width < WIDE_CARD_MIN_PX) {
        setState({ layout: "hidden", scale, stacked: false })
      } else if (width < WIDE_CHIP_ROW_MIN_PX) {
        setState({ layout: "grid", scale, stacked })
      } else {
        setState({ layout: "rows", scale, stacked })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return state
}

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  gradient: string
  delay?: number
  className?: string
}

function StatCard({ title, value, description, icon, gradient, delay = 0, className }: StatCardProps) {
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
      className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-xl group cursor-pointer transform hover:-translate-y-1 w-full flex flex-col",
        statCardShell,
        className
      )}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms, box-shadow 0.5s ease, translate 0.5s ease`,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6 relative z-10 shrink-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate pr-2 min-w-0">
          {title}
        </CardTitle>
        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
          <div className="text-blue-600 dark:text-blue-400">{icon}</div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex-1 min-h-0 flex flex-col justify-end pb-6 pt-0">
        <div className="h-10 flex items-end">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 leading-none tabular-nums truncate w-full">
            {value}
          </div>
        </div>
        <p className="h-8 text-xs text-muted-foreground font-medium leading-4 line-clamp-2">{description}</p>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  title,
  typeTotals,
  gradient,
  icon,
}: {
  title: string
  typeTotals: TransactionTypeTotals
  gradient: string
  icon: React.ReactNode
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { layout: chipLayout, scale: chipScale, stacked } = useCardChipLayout(cardRef)
  const showChips = chipLayout !== "hidden"
  const [expanded, setExpanded] = useState<{ scrap: boolean; melt: boolean }>({ scrap: false, melt: false })

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-xl group transform hover:-translate-y-1 w-full flex flex-col min-h-44 h-auto",
        showChips ? "flex-1 min-w-[min(100%,11.5rem)] shrink-0" : statCardShell
      )}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-6 relative z-10 shrink-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate pr-2 min-w-0">
          {title}
        </CardTitle>
        {!showChips && (
          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
            <div className="text-blue-600 dark:text-blue-400">{icon}</div>
          </div>
        )}
      </CardHeader>

      <CardContent
        className={cn(
          "relative z-10 flex-1 min-h-0 pt-0",
          showChips ? cn("flex gap-2 pb-4", stacked ? "flex-col" : "flex-row items-stretch") : "flex flex-col justify-end pb-6"
        )}
      >
        <div className={cn("flex min-w-0 flex-col justify-end", showChips && !stacked ? "w-[40%] shrink-0" : "w-full")}>
          <div className="h-10 flex items-end">
            <div className="text-4xl font-extrabold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 leading-none tabular-nums truncate w-full">
              {typeTotals.count}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium leading-4 line-clamp-2">
            {showChips
              ? `transactions · ${formatCurrency(typeTotals.total)}`
              : `transactions · Total: ${formatCurrency(typeTotals.total)}`}
          </p>
        </div>

        {showChips && (
          <div className={cn("min-w-0 max-w-full", stacked ? "w-full" : "h-full w-[60%] flex-1")}>
            <div
              className={cn(
                "grid min-h-[5.5rem] min-w-0 max-w-full gap-1.5 overflow-hidden",
                chipLayout === "rows"
                  ? "grid-cols-3 grid-rows-[minmax(0,1.15fr)_minmax(0,0.9fr)]"
                  : "grid-cols-2 grid-rows-2"
              )}
            >
              <CompactTypeChip
                label="Scrap"
                amount={typeTotals.scrap}
                tone="scrap"
                variant={chipLayout}
                scale={chipScale}
                expandable
                expanded={expanded.scrap}
                onToggle={() => setExpanded((prev) => ({ ...prev, scrap: !prev.scrap }))}
              />
              <CompactTypeChip label="Sale" amount={typeTotals.sale} tone="sale" variant={chipLayout} scale={chipScale} />
              <CompactTypeChip
                label="Melt"
                amount={typeTotals.melt}
                tone="melt"
                variant={chipLayout}
                scale={chipScale}
                expandable
                expanded={expanded.melt}
                onToggle={() => setExpanded((prev) => ({ ...prev, melt: !prev.melt }))}
              />
              <div className={cn("min-h-0 min-w-0 overflow-hidden", chipLayout === "rows" && "col-span-3")}>
                <CompactTotalChip amount={typeTotals.total} variant={chipLayout} scale={chipScale} />
              </div>
            </div>
            {expanded.scrap ? <MetalBreakdownRow breakdown={typeTotals.scrapByMetal} /> : null}
            {expanded.melt ? <MetalBreakdownRow breakdown={typeTotals.meltByMetal} /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DashboardStatsProps {
  customerCount: number
  cardCount: number
  openTransactions: number
  todayTypeTotals?: TransactionTypeTotals
  allTimeTypeTotals?: TransactionTypeTotals
  isAdmin?: boolean
}

const emptyTotals: TransactionTypeTotals = emptyTypeTotals()

export function DashboardStats({
  customerCount,
  cardCount,
  openTransactions,
  todayTypeTotals,
  allTimeTypeTotals,
  isAdmin = false,
}: DashboardStatsProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-4 sm:gap-6 w-full">
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
            typeTotals={todayTypeTotals ?? emptyTotals}
            gradient="from-amber-500/20 via-amber-400/10 to-transparent"
            icon={<CalendarDays className="h-6 w-6" />}
          />
          <SummaryCard
            title="All-time summary"
            typeTotals={allTimeTypeTotals ?? emptyTotals}
            gradient="from-indigo-500/20 via-indigo-400/10 to-transparent"
            icon={<History className="h-6 w-6" />}
          />
        </>
      )}
    </div>
  )
}
