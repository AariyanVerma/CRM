"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import type { DailyPricesPayload, PurityPrice } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"
import { fromDwt, lineTotal, MAPS_DIRECTIONS_HREF, MAPS_EMBED_SRC, MAPS_HREF, toDwt, type WeightUnit } from "@/lib/brand"
import { IconGold, IconPlatinum, IconSilver } from "@/components/icons"
import { SiteShell } from "@/components/site-shell"

function UnitToggle({ unit, onChange }: { unit: WeightUnit; onChange: (unit: WeightUnit) => void }) {
  return (
    <div
      className="inline-flex rounded-full border border-slate-200 bg-white/80 p-1 shadow-glass-sm"
      role="group"
      aria-label="Weight unit"
    >
      {(["DWT", "GRAM"] as const).map((option) => {
        const active = unit === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-[44px] rounded-full px-5 text-sm font-extrabold tracking-wide transition ${
              active
                ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-700 text-white shadow-gold-glow"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {option === "GRAM" ? "Gram" : "DWT"}
          </button>
        )
      })}
    </div>
  )
}

function CalculatorTable({
  title,
  titleClass,
  Icon,
  rows,
  valueClass,
  accentBorder,
  unit,
  weights,
  onWeightChange,
  sectionTotal,
}: {
  title: string
  titleClass: string
  Icon: (props: { className?: string }) => ReactNode
  rows: PurityPrice[]
  valueClass: string
  accentBorder: string
  unit: WeightUnit
  weights: Record<string, string>
  onWeightChange: (purity: string, value: string) => void
  sectionTotal: number
}) {
  return (
    <section className={`glass-panel p-4 sm:p-5 ${accentBorder}`}>
      <div className="mb-4 flex items-center gap-3 px-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white bg-white/90 shadow-glass-sm">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className={`text-2xl font-extrabold tracking-tight ${titleClass}`}>{title}</h2>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
            Enter weight to estimate
          </p>
        </div>
      </div>

      <div className="mb-2 hidden grid-cols-4 gap-3 px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-faint sm:grid sm:px-4 [&>*]:min-w-0 [&>*]:text-center">
        <span>Purity</span>
        <span>Rate / {unit === "DWT" ? "DWT" : "Gram"}</span>
        <span>Weight ({unit === "DWT" ? "DWT" : "g"})</span>
        <span>Total</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const rate = unit === "DWT" ? row.dwt : row.gram
          const raw = weights[row.purity] ?? ""
          const weightNum = raw === "" ? 0 : Number(raw)
          const total = lineTotal(weightNum, unit, row.dwt)
          return (
            <li
              key={row.purity}
              className={`grid grid-cols-1 gap-3 rounded-2xl border bg-white/80 px-3 py-3.5 shadow-glass-sm sm:grid-cols-4 sm:items-center sm:gap-3 sm:px-4 [&>*]:min-w-0 ${accentBorder}`}
            >
              <div className="flex items-center justify-between gap-2 sm:block sm:text-center">
                <span className="text-lg font-extrabold text-ink-soft sm:text-xl">{row.purity}</span>
                <span className={`num text-base font-extrabold sm:hidden ${valueClass}`}>
                  ${formatMoney(rate)}
                </span>
              </div>
              <span className={`num hidden text-center text-lg font-extrabold sm:block ${valueClass}`}>
                ${formatMoney(rate)}
              </span>
              <label className="block w-full sm:text-center">
                <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-faint sm:hidden">
                  Weight ({unit === "DWT" ? "DWT" : "g"})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={raw}
                  onChange={(e) => onWeightChange(row.purity, e.target.value)}
                  className="num w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-base font-bold text-ink outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </label>
              <div className="flex items-center justify-between gap-2 sm:block sm:text-center">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-faint sm:hidden">
                  Total
                </span>
                <span className={`num text-lg font-extrabold sm:text-xl ${valueClass}`}>
                  ${formatMoney(total)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <div
        className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r from-white via-white to-white/70 px-4 py-3.5 shadow-glass-sm ${accentBorder}`}
      >
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-ink-faint">
          {title} total
        </span>
        <span className={`num text-2xl font-extrabold sm:text-3xl ${valueClass}`}>
          ${formatMoney(sectionTotal)}
        </span>
      </div>
    </section>
  )
}

export function PriceCalculator() {
  const [data, setData] = useState<DailyPricesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unit, setUnit] = useState<WeightUnit>("DWT")
  const [goldWeights, setGoldWeights] = useState<Record<string, string>>({})
  const [silverWeights, setSilverWeights] = useState<Record<string, string>>({})

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
  }, [load])

  function changeUnit(next: WeightUnit) {
    if (next === unit) return
    const convertMap = (map: Record<string, string>) => {
      const out: Record<string, string> = {}
      for (const [key, raw] of Object.entries(map)) {
        if (raw === "") continue
        const n = Number(raw)
        if (!Number.isFinite(n) || n <= 0) continue
        const dwt = toDwt(n, unit)
        const converted = fromDwt(dwt, next)
        out[key] = String(Math.round(converted * 10000) / 10000)
      }
      return out
    }
    setGoldWeights((prev) => convertMap(prev))
    setSilverWeights((prev) => convertMap(prev))
    setUnit(next)
  }

  const goldTotal = useMemo(() => {
    if (!data) return 0
    return data.onStone.reduce((sum, row) => {
      const n = Number(goldWeights[row.purity] || 0)
      return sum + lineTotal(n, unit, row.dwt)
    }, 0)
  }, [data, goldWeights, unit])

  const silverTotal = useMemo(() => {
    if (!data) return 0
    return data.silver.reduce((sum, row) => {
      const n = Number(silverWeights[row.purity] || 0)
      return sum + lineTotal(n, unit, row.dwt)
    }, 0)
  }, [data, silverWeights, unit])

  const grandTotal = goldTotal + silverTotal

  return (
    <SiteShell
      subtitle="Estimate your buyout with today's published On Stone and Silver rates. Final value is confirmed in store."
      skipHref="#calculator"
      skipLabel="Skip to calculator"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-bold text-ink-soft shadow-glass-sm transition hover:border-amber-300 hover:text-ink"
        >
          ← Back to prices
        </Link>
        {data ? (
          <time
            dateTime={data.date}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-bold text-emerald-800 shadow-glass-sm"
          >
            {formatBoardDate(data.date)}
          </time>
        ) : null}
      </div>

      <section id="calculator" className="mb-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-emerald-700">
              Price calculator
            </p>
            <h2 className="metal-text-brand text-3xl font-extrabold tracking-tight sm:text-4xl">
              Calculate Your Price
            </h2>
          </div>
          <UnitToggle unit={unit} onChange={changeUnit} />
        </div>

        {data ? (
          <ul className="mb-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Gold", data.spots.gold, "metal-text-gold", IconGold],
                ["Silver", data.spots.silver, "metal-text-silver", IconSilver],
                ["Platinum", data.spots.platinum, "metal-text-platinum", IconPlatinum],
              ] as const
            ).map(([label, value, color, Icon]) => (
              <li key={label} className="glass-panel flex items-center gap-3 p-4">
                <Icon className="h-8 w-8" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
                  <p className={`num text-xl font-extrabold ${color}`}>${formatMoney(value)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {loading && !data ? (
          <div className="glass-panel px-6 py-14 text-center text-ink-muted" role="status">
            Loading prices…
          </div>
        ) : error && !data ? (
          <div className="glass-panel px-6 py-14 text-center font-medium text-red-600" role="alert">
            {error}
          </div>
        ) : data ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <CalculatorTable
              title="On Stone"
              titleClass="metal-text-gold"
              Icon={IconGold}
              rows={data.onStone}
              valueClass="metal-text-gold"
              accentBorder="border-amber-200/70"
              unit={unit}
              weights={goldWeights}
              onWeightChange={(purity, value) =>
                setGoldWeights((prev) => ({ ...prev, [purity]: value }))
              }
              sectionTotal={goldTotal}
            />
            <CalculatorTable
              title="Silver"
              titleClass="metal-text-silver"
              Icon={IconSilver}
              rows={data.silver}
              valueClass="metal-text-silver"
              accentBorder="border-slate-300/80"
              unit={unit}
              weights={silverWeights}
              onWeightChange={(purity, value) =>
                setSilverWeights((prev) => ({ ...prev, [purity]: value }))
              }
              sectionTotal={silverTotal}
            />
          </div>
        ) : null}
      </section>

      {data ? (
        <section className="glass-panel border-amber-200/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-faint">
                Estimated total
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-muted">
                On Stone ${formatMoney(goldTotal)} · Silver ${formatMoney(silverTotal)}
              </p>
            </div>
            <p className="num metal-text-gold text-4xl font-extrabold sm:text-5xl">
              ${formatMoney(grandTotal)}
            </p>
          </div>
        </section>
      ) : null}

      <aside className="mt-6 rounded-[1.5rem] border border-amber-300/60 bg-amber-50/80 px-4 py-3 shadow-glass-sm sm:px-5 sm:py-3.5">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-amber-900">
          Disclaimer
        </p>
        <p className="mt-1.5 text-justify text-sm leading-snug text-ink-soft sm:text-[0.95rem] sm:leading-relaxed">
          This calculator provides an estimated value based on current market rates. Final payouts are
          subject to in-person verification of exact weight, purity, and metal content. Official
          appraisals are completed exclusively at our window. Prices are subject to live market
          fluctuations.
        </p>
        <a
          href={MAPS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mt-2.5 flex w-fit max-w-full items-center justify-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3.5 py-2 text-center text-xs font-bold text-amber-950 shadow-glass-sm transition hover:border-amber-300 hover:bg-white hover:shadow-glass-md sm:gap-2.5 sm:px-4 sm:text-sm"
        >
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 sm:h-8 sm:w-8"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="whitespace-nowrap">33W 47th Street · Window #2 · New York, NY 10036</span>
        </a>
      </aside>

      <section className="relative mt-5 overflow-hidden rounded-[1.5rem] shadow-glass-md ring-1 ring-black/[0.04]">
        <div className="relative h-56 w-full bg-slate-100 sm:h-72">
          <iframe
            title="New York Gold Market location map"
            src={MAPS_EMBED_SRC}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="absolute bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2">
          <a
            href={MAPS_DIRECTIONS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white shadow-glass-lg transition hover:bg-slate-800 active:scale-[0.99] sm:text-base"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3 L20 12 L12 21 L4 12 Z" strokeLinejoin="round" />
              <path d="M12 7 V17" strokeLinecap="round" />
            </svg>
            Get Directions
          </a>
        </div>
      </section>
    </SiteShell>
  )
}
