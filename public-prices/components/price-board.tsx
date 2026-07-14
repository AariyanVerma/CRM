"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"
const MAPS_HREF =
  "https://maps.google.com/?q=33W+47th+Street+Window+%232+New+York+NY+10036"

const SPOT_CARDS = [
  {
    key: "gold" as const,
    label: "Gold",
    chip: "border-gold-ring bg-gold-wash text-gold",
    glow: "from-amber-200/40 via-transparent to-transparent",
    ringHover: "hover:border-gold-ring",
  },
  {
    key: "silver" as const,
    label: "Silver",
    chip: "border-silver-ring bg-silver-wash text-silver",
    glow: "from-slate-200/50 via-transparent to-transparent",
    ringHover: "hover:border-silver-ring",
  },
  {
    key: "platinum" as const,
    label: "Platinum",
    chip: "border-platinum-ring bg-platinum-wash text-platinum",
    glow: "from-sky-100/60 via-transparent to-transparent",
    ringHover: "hover:border-platinum-ring",
  },
]

function PriceGrid({
  title,
  titleClass,
  rows,
}: {
  title: string
  titleClass: string
  rows: { purity: string; dwt: number; gram: number }[]
}) {
  return (
    <section className="glass overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-5 py-4 sm:px-7">
        <h2 className={`text-xl font-semibold tracking-tight sm:text-2xl ${titleClass}`}>
          {title}
        </h2>
        <span className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink-faint sm:inline">
          Buy rates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] border-collapse text-left">
          <thead>
            <tr className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              <th scope="col" className="px-5 py-4 font-semibold sm:px-7">
                Purity
              </th>
              <th scope="col" className="px-5 py-4 text-right font-semibold sm:px-7">
                DWT
              </th>
              <th scope="col" className="px-5 py-4 text-right font-semibold sm:px-7">
                Gram
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.purity}
                className="border-t border-black/[0.04] transition-colors duration-200 hover:bg-black/[0.02]"
              >
                <th
                  scope="row"
                  className="px-5 py-5 text-lg font-semibold text-ink sm:px-7 sm:text-xl"
                >
                  {row.purity}
                </th>
                <td className="num px-5 py-5 text-right text-lg font-bold text-ink sm:px-7 sm:text-xl">
                  ${formatMoney(row.dwt)}
                </td>
                <td className="num px-5 py-5 text-right text-lg font-bold text-ink sm:px-7 sm:text-xl">
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
    <div className="relative min-h-screen overflow-x-hidden bg-mesh">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(245,245,247,0.85)_100%)]"
        aria-hidden
      />

      <a
        href="#spot-prices"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to prices
      </a>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="animate-fade-up mb-12 text-center sm:mb-16">
          <div className="mb-7 flex justify-center">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="New York Gold Market"
                className="h-16 w-auto max-w-[240px] object-contain drop-shadow-sm sm:h-20 sm:max-w-[280px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex h-16 items-center justify-center rounded-2xl border border-gold-ring bg-gold-wash px-6 text-2xl font-extrabold tracking-tight text-gold sm:h-20 sm:text-3xl">
                NYGM
              </div>
            )}
          </div>

          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-gold">
            Diamond District · New York
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
            New York Gold Market
          </h1>
          <p className="mt-3 text-xl font-semibold text-ink-soft sm:text-2xl">We Buy Gold</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-ink-muted sm:text-lg">
            Live buy prices, updated throughout the day.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <a
              href={PHONE_HREF}
              className="group inline-flex min-h-[56px] items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold px-9 text-lg font-bold tracking-wide text-white shadow-cta transition duration-300 hover:scale-[1.02] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold active:scale-[0.99] sm:text-xl"
            >
              <span
                className="mr-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm transition group-hover:bg-white/30"
                aria-hidden
              >
                ☎
              </span>
              {PHONE_DISPLAY}
            </a>
            <a
              href={MAPS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-md text-center text-base font-medium text-ink-muted transition duration-200 hover:text-ink sm:text-lg"
            >
              33W 47th Street · Window #2 · New York, NY 10036
            </a>
          </div>
        </header>

        <section
          id="spot-prices"
          className="animate-fade-up mb-10 [animation-delay:70ms] sm:mb-12"
          aria-labelledby="spot-heading"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                Live market
              </p>
              <h2
                id="spot-heading"
                className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Today&apos;s Spot Prices
              </h2>
            </div>
            {data ? (
              <time
                dateTime={data.date}
                className="rounded-full border border-black/[0.06] bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-ink-soft shadow-sm"
              >
                {formatBoardDate(data.date)}
              </time>
            ) : null}
          </div>

          {loading && !data ? (
            <div
              className="glass rounded-[1.75rem] px-6 py-12 text-center text-ink-muted"
              role="status"
            >
              Loading live prices…
            </div>
          ) : error && !data ? (
            <div
              className="glass rounded-[1.75rem] px-6 py-12 text-center font-medium text-red-600"
              role="alert"
            >
              {error}
            </div>
          ) : data ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-3">
                {SPOT_CARDS.map((metal) => (
                  <li
                    key={metal.key}
                    className={`group relative overflow-hidden rounded-[1.5rem] border border-white bg-white/75 p-6 shadow-glass backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${metal.ringHover}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metal.glow}`}
                      aria-hidden
                    />
                    <div className="relative">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] ${metal.chip}`}
                      >
                        {metal.label}
                      </span>
                      <p className="num mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
                        ${formatMoney(data.spots[metal.key])}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-ink-faint">per troy oz</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 px-1 text-base text-ink-muted">
                Last updated{" "}
                <span className="font-semibold text-ink-soft">
                  {new Date(data.updatedAt).toLocaleString()}
                </span>
                {error ? <span className="font-medium text-red-600"> · refresh delayed</span> : null}
              </p>
            </>
          ) : null}
        </section>

        {data ? (
          <div className="animate-fade-up grid gap-5 [animation-delay:120ms] lg:grid-cols-[1.15fr_0.85fr]">
            <PriceGrid title="On Stone" titleClass="text-gold" rows={data.onStone} />
            <PriceGrid title="Silver" titleClass="text-silver" rows={data.silver} />
          </div>
        ) : null}

        <footer className="animate-fade-up mt-14 border-t border-black/[0.05] pt-8 text-center [animation-delay:180ms]">
          <p className="text-sm text-ink-faint sm:text-base">
            © New York Gold Market. Prices subject to change. Final appraisal at the window.
          </p>
        </footer>
      </div>
    </div>
  )
}
