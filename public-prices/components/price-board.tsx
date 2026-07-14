"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"
const MAPS_HREF =
  "https://maps.google.com/?q=33W+47th+Street+Window+%232+New+York+NY+10036"

const SPOT_META = [
  {
    key: "gold" as const,
    label: "Gold",
    accent: "from-amber-400/20 via-transparent to-transparent",
    ring: "group-hover:border-gold/40",
    chip: "text-gold-bright bg-gold/10 border-gold/20",
  },
  {
    key: "silver" as const,
    label: "Silver",
    accent: "from-slate-300/15 via-transparent to-transparent",
    ring: "group-hover:border-metal-silver/40",
    chip: "text-metal-silver bg-white/5 border-white/10",
  },
  {
    key: "platinum" as const,
    label: "Platinum",
    accent: "from-sky-300/15 via-transparent to-transparent",
    ring: "group-hover:border-metal-platinum/40",
    chip: "text-metal-platinum bg-white/5 border-white/10",
  },
]

function PriceGrid({
  title,
  accentClass,
  rows,
}: {
  title: string
  accentClass: string
  rows: { purity: string; dwt: number; gram: number }[]
}) {
  return (
    <section className="glass overflow-hidden rounded-[1.5rem]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h2 className={`text-lg font-semibold tracking-tight sm:text-xl ${accentClass}`}>
          {title}
        </h2>
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:inline">
          Buy rates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left">
          <thead>
            <tr className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <th scope="col" className="px-5 py-3.5 font-semibold sm:px-6">
                Purity
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold sm:px-6">
                DWT
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold sm:px-6">
                Gram
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.purity}
                className="border-t border-white/[0.05] transition-colors duration-200 hover:bg-white/[0.035]"
              >
                <th
                  scope="row"
                  className="px-5 py-4 text-base font-semibold text-slate-100 sm:px-6 sm:text-lg"
                >
                  {row.purity}
                </th>
                <td className="num px-5 py-4 text-right text-base font-bold text-gold-bright sm:px-6 sm:text-lg">
                  ${formatMoney(row.dwt)}
                </td>
                <td className="num px-5 py-4 text-right text-base font-bold text-gold-bright sm:px-6 sm:text-lg">
                  ${formatMoney(row.gram)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function PriceBoard() {
  const [data, setData] = useState<DailyPricesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoFailed, setLogoFailed] = useState(false)

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
    <div className="relative min-h-screen overflow-x-hidden bg-mesh-dark">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,13,0.65)_100%)]"
        aria-hidden
      />

      <a
        href="#spot-prices"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-midnight-950"
      >
        Skip to prices
      </a>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <header className="animate-fade-up mb-10 text-center sm:mb-14">
          <div className="mb-6 flex justify-center">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="New York Gold Market"
                className="h-14 w-auto max-w-[220px] object-contain drop-shadow-[0_8px_30px_rgba(201,162,39,0.25)] sm:h-20 sm:max-w-[280px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex h-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 px-6 text-2xl font-extrabold tracking-tight text-gold-bright sm:h-20 sm:text-3xl">
                NYGM
              </div>
            )}
          </div>

          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold-soft">
            Diamond District · New York
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            New York Gold Market
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-300 sm:text-xl">We Buy Gold</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:text-base">
            Live buy prices, updated throughout the day.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href={PHONE_HREF}
              className="group inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-b from-gold-bright to-gold px-8 text-lg font-bold tracking-wide text-midnight-950 shadow-cta transition duration-300 hover:scale-[1.02] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright active:scale-[0.99] sm:text-xl"
            >
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-base transition group-hover:bg-black/15">
                ☎
              </span>
              {PHONE_DISPLAY}
            </a>
            <a
              href={MAPS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-sm text-center text-sm font-medium text-slate-400 transition hover:text-slate-200 sm:text-base"
            >
              33W 47th Street · Window #2 · New York, NY 10036
            </a>
          </div>
        </header>

        <section
          id="spot-prices"
          className="animate-fade-up mb-8 [animation-delay:80ms] sm:mb-10"
          aria-labelledby="spot-heading"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Live market
              </p>
              <h2 id="spot-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Today&apos;s Spot Prices
              </h2>
            </div>
            {data ? (
              <time
                dateTime={data.date}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 sm:text-sm"
              >
                {formatBoardDate(data.date)}
              </time>
            ) : null}
          </div>

          {loading && !data ? (
            <div className="glass rounded-[1.5rem] px-6 py-10 text-center text-slate-400" role="status">
              Loading live prices…
            </div>
          ) : error && !data ? (
            <div className="glass rounded-[1.5rem] px-6 py-10 text-center text-rose-300" role="alert">
              {error}
            </div>
          ) : data ? (
            <>
              <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                {SPOT_META.map((metal) => (
                  <li
                    key={metal.key}
                    className={`group relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-glass backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06] ${metal.ring}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metal.accent}`}
                      aria-hidden
                    />
                    <div className="relative">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] ${metal.chip}`}
                      >
                        {metal.label}
                      </span>
                      <p className="num mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        ${formatMoney(data.spots[metal.key])}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">per troy oz</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 px-1 text-sm text-slate-500">
                Last updated{" "}
                <span className="font-medium text-slate-400">
                  {new Date(data.updatedAt).toLocaleString()}
                </span>
                {error ? <span className="text-rose-300"> · refresh delayed</span> : null}
              </p>
            </>
          ) : null}
        </section>

        {data ? (
          <div className="animate-fade-up grid gap-4 [animation-delay:140ms] lg:grid-cols-[1.15fr_0.85fr]">
            <PriceGrid title="On Stone" accentClass="text-gold-bright" rows={data.onStone} />
            <PriceGrid title="Silver" accentClass="text-metal-silver" rows={data.silver} />
          </div>
        ) : null}

        <footer className="animate-fade-up mt-12 border-t border-white/[0.06] pt-8 text-center [animation-delay:200ms]">
          <p className="text-sm text-slate-500">
            © New York Gold Market. Prices subject to change. Final appraisal at the window.
          </p>
        </footer>
      </div>
    </div>
  )
}
