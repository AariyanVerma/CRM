"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"
import { IconGold, IconPlatinum, IconSilver } from "@/components/icons"
import { SiteShell } from "@/components/site-shell"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000

const METAL_META = [
  {
    key: "gold" as const,
    label: "Gold",
    Icon: IconGold,
    priceClass: "metal-text-gold",
    wash: "from-amber-200/50 via-orange-100/30 to-transparent",
    chip: "border-amber-400/40 bg-amber-50 text-amber-900",
    card: "border-amber-300/50 hover:shadow-gold-glow",
    delay: "0ms",
  },
  {
    key: "silver" as const,
    label: "Silver",
    Icon: IconSilver,
    priceClass: "metal-text-silver",
    wash: "from-slate-300/45 via-slate-100/35 to-transparent",
    chip: "border-slate-400/50 bg-slate-100 text-slate-800",
    card: "border-slate-400/45 hover:shadow-silver-glow",
    delay: "90ms",
  },
  {
    key: "platinum" as const,
    label: "Platinum",
    Icon: IconPlatinum,
    priceClass: "metal-text-platinum",
    wash: "from-sky-300/45 via-cyan-100/30 to-transparent",
    chip: "border-sky-400/45 bg-sky-50 text-sky-900",
    card: "border-sky-400/50 hover:shadow-plat-glow",
    delay: "180ms",
  },
]

function RateList({
  title,
  titleClass,
  Icon,
  rows,
  valueClass,
  accentBorder,
  baseDelay = 0,
}: {
  title: string
  titleClass: string
  Icon: (props: { className?: string }) => ReactNode
  rows: { purity: string; dwt: number; gram: number }[]
  valueClass: string
  accentBorder: string
  baseDelay?: number
}) {
  return (
    <section className={`glass-panel p-4 sm:p-5 ${accentBorder}`}>
      <div className="mb-4 flex items-center gap-3 px-1">
        <div className="flex h-12 w-12 animate-floaty items-center justify-center rounded-2xl border border-white bg-white/90 shadow-glass-sm">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className={`text-2xl font-extrabold tracking-tight ${titleClass}`}>{title}</h2>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">Buy rates</p>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-faint sm:px-4">
        <span>Purity</span>
        <span className="w-[5.5rem] text-right sm:w-[6.5rem]">DWT</span>
        <span className="w-[5.5rem] text-right sm:w-[6.5rem]">Gram</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <li
            key={row.purity}
            className={`animate-row-in group grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl border bg-white/80 px-3 py-3.5 shadow-glass-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-white hover:shadow-glass-lg sm:px-4 sm:py-4 ${accentBorder}`}
            style={{ animationDelay: `${baseDelay + i * 60}ms` }}
          >
            <span className="text-lg font-extrabold text-ink-soft sm:text-xl">{row.purity}</span>
            <span
              className={`num w-[5.5rem] text-right text-lg font-extrabold sm:w-[6.5rem] sm:text-xl ${valueClass}`}
            >
              ${formatMoney(row.dwt)}
            </span>
            <span
              className={`num w-[5.5rem] text-right text-lg font-extrabold sm:w-[6.5rem] sm:text-xl ${valueClass}`}
            >
              ${formatMoney(row.gram)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PriceBoard() {
  const [data, setData] = useState<DailyPricesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" })
      const json = (await res.json().catch(() => ({}))) as DailyPricesPayload & {
        message?: string
      }
      if (!res.ok) {
        throw new Error(json.message || "Failed to load prices")
      }
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prices")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => {
      void load()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  return (
    <SiteShell
      subtitle="Today's published buy rates for gold, silver, and platinum."
      skipHref="#metal-prices"
      skipLabel="Skip to prices"
    >
      <section id="metal-prices" className="mb-10 sm:mb-12" aria-labelledby="metal-heading">
        <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-3 px-1 [animation-delay:60ms]">
          <div>
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-emerald-700">
              Daily board
            </p>
            <h2
              id="metal-heading"
              className="metal-text-brand text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Today&apos;s Metal Prices
            </h2>
          </div>
          {data ? (
            <time
              dateTime={data.date}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-bold text-emerald-800 shadow-glass-sm"
            >
              {formatBoardDate(data.date)}
            </time>
          ) : null}
        </div>

        {loading && !data ? (
          <div className="glass-panel px-6 py-14 text-center text-ink-muted" role="status">
            Loading prices…
          </div>
        ) : error && !data ? (
          <div className="glass-panel px-6 py-14 text-center font-medium text-red-600" role="alert">
            {error}
          </div>
        ) : data ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {METAL_META.map((metal) => {
                const Icon = metal.Icon
                return (
                  <li
                    key={metal.key}
                    className={`animate-fade-up group relative overflow-hidden rounded-[1.75rem] border bg-white/75 p-6 shadow-glass-md backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-glass-lg ${metal.card}`}
                    style={{ animationDelay: metal.delay }}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metal.wash}`}
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] ${metal.chip}`}
                        >
                          <Icon className="h-4 w-4" />
                          {metal.label}
                        </span>
                        <span className="animate-floaty">
                          <Icon className="h-10 w-10 drop-shadow-md transition duration-300 group-hover:scale-110" />
                        </span>
                      </div>
                      <p
                        className={`num mt-6 text-4xl font-extrabold tracking-tight sm:text-[2.85rem] ${metal.priceClass}`}
                      >
                        ${formatMoney(data.spots[metal.key])}
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-ink-muted">per troy oz</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <p className="mt-5 flex flex-wrap items-center gap-2 px-1 text-base text-ink-muted">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
              <span className="font-extrabold text-emerald-700">Published</span>
              <span>· As of</span>
              <span className="font-bold text-ink-soft">
                {new Date(data.updatedAt).toLocaleString()}
              </span>
              {error ? <span className="font-medium text-red-600"> · refresh delayed</span> : null}
            </p>
          </>
        ) : null}
      </section>

      {data ? (
        <div className="animate-fade-up grid gap-5 [animation-delay:200ms] lg:grid-cols-2">
          <RateList
            title="On Stone"
            titleClass="metal-text-gold"
            Icon={IconGold}
            rows={data.onStone}
            valueClass="metal-text-gold"
            accentBorder="border-amber-200/70"
            baseDelay={220}
          />
          <RateList
            title="Silver"
            titleClass="metal-text-silver"
            Icon={IconSilver}
            rows={data.silver}
            valueClass="metal-text-silver"
            accentBorder="border-slate-300/80"
            baseDelay={280}
          />
        </div>
      ) : null}

      <div className="animate-fade-up mt-10 flex justify-center [animation-delay:260ms]">
        <Link
          href="/calculator"
          className="calc-cta group relative inline-flex min-h-[54px] items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white px-9 text-lg font-extrabold text-ink shadow-glass-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-slate-400 hover:bg-white hover:shadow-glass-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 active:scale-[0.98]"
        >
          <span className="calc-cta-shine pointer-events-none absolute inset-0" aria-hidden />
          <span className="relative z-10 flex items-center gap-2">
            Calculate Your Price
            <span className="inline-block transition duration-300 group-hover:translate-x-1.5" aria-hidden>
              →
            </span>
          </span>
        </Link>
      </div>
    </SiteShell>
  )
}
