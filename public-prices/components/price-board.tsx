"use client"

import { useCallback, useEffect, useId, useState, type ReactNode } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"
const MAPS_HREF =
  "https://maps.google.com/?q=33W+47th+Street+Window+%232+New+York+NY+10036"

function IconGold({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe08a" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#7a5608" />
        </linearGradient>
      </defs>
      <rect x="7" y="20" width="34" height="16" rx="3" fill={`url(#${id})`} />
      <path d="M11 20 L15.5 11 H32.5 L37 20 Z" fill="#f0d78c" />
      <rect x="14" y="25" width="20" height="2.5" rx="1" fill="#fff6d6" opacity="0.55" />
      <circle cx="24" cy="33" r="3.2" fill="#fff1b8" opacity="0.7" />
    </svg>
  )
}

function IconSilver({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const id2 = `${id}b`
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop offset="0.35" stopColor="#64748b" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={id2} x1="10" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e2e8f0" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <rect x="9" y="28" width="30" height="10" rx="2" fill={`url(#${id})`} />
      <rect x="11" y="19" width="26" height="10" rx="2" fill={`url(#${id2})`} />
      <rect x="13" y="10" width="22" height="10" rx="2" fill={`url(#${id})`} />
      <text
        x="24"
        y="17.5"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="7"
        fontWeight="700"
        fontFamily="Inter, Arial, sans-serif"
      >
        Ag
      </text>
      <path d="M15 13.5 H33" stroke="#ffffff" strokeWidth="1" opacity="0.45" />
    </svg>
  )
}

function IconPlatinum({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bae6fd" />
          <stop offset="0.4" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>
      <path d="M24 6 L40 15.5 V32.5 L24 42 L8 32.5 V15.5 Z" fill={`url(#${id})`} />
      <path
        d="M24 13 L33 18.5 V29.5 L24 35 L15 29.5 V18.5 Z"
        stroke="#e0f2fe"
        strokeWidth="1.8"
        opacity="0.75"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill="#f0f9ff"
        fontSize="8"
        fontWeight="800"
        fontFamily="Inter, Arial, sans-serif"
      >
        Pt
      </text>
    </svg>
  )
}

function IconPhone({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.2 3.8 H5.3 C4.5 3.8 3.8 4.5 3.9 5.3 C4.4 10.6 8.1 14.4 13.4 15 C14.2 15.1 14.9 14.4 14.9 13.6 V11.6 C14.9 11.1 14.6 10.6 14.1 10.4 L12.5 9.9 C12 9.7 11.5 9.9 11.2 10.3 L10.4 11.2 C9 10.4 7.8 9.2 7 7.8 L7.9 7 C8.3 6.6 8.5 6.1 8.3 5.6 L7.8 4 C7.6 3.5 7.1 3.2 6.6 3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(2.2 2.2)"
      />
    </svg>
  )
}

const SPOT_META = [
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-aurora absolute -left-16 top-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="animate-aurora absolute -right-10 top-32 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl [animation-delay:2s]" />
        <div className="animate-aurora absolute bottom-24 left-1/3 h-64 w-64 rounded-full bg-slate-400/15 blur-3xl [animation-delay:4s]" />
        <div className="animate-aurora absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-rose-300/10 blur-3xl [animation-delay:1s]" />
      </div>

      <a
        href="#spot-prices"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to prices
      </a>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="animate-fade-up mb-12 text-center sm:mb-14">
          <div className="mb-7 flex justify-center">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="New York Gold Market"
                className="h-24 w-auto max-w-[280px] object-contain sm:h-28 sm:max-w-[320px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex h-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-wash px-6 text-2xl font-extrabold tracking-tight text-gold-deep sm:h-20 sm:text-3xl">
                NYGM
              </div>
            )}
          </div>

          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.34em] text-amber-800">
            Diamond District · New York
          </p>
          <h1 className="metal-text-brand text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
            New York Gold Market
          </h1>
          <p className="metal-text-gold mt-3 text-xl font-extrabold sm:text-2xl">We Buy Gold</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-ink-muted sm:text-lg">
            Live buy prices for the floor — colorful, clear, and always updating.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <a
              href={PHONE_HREF}
              className="group inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-700 px-9 text-lg font-bold tracking-wide text-white shadow-gold-glow transition duration-300 hover:-translate-y-1 hover:scale-[1.04] hover:shadow-glass-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 active:scale-[0.99] sm:text-xl"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/25 transition group-hover:rotate-12 group-hover:bg-white/35">
                <IconPhone className="h-4 w-4" />
              </span>
              {PHONE_DISPLAY}
            </a>
            <a
              href={MAPS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-md text-center text-base font-medium text-ink-muted transition duration-200 hover:text-sky-700 sm:text-lg"
            >
              33W 47th Street · Window #2 · New York, NY 10036
            </a>
          </div>
        </header>

        <section id="spot-prices" className="mb-10 sm:mb-12" aria-labelledby="spot-heading">
          <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-3 px-1 [animation-delay:60ms]">
            <div>
              <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-emerald-700">
                Live market
              </p>
              <h2
                id="spot-heading"
                className="metal-text-brand text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                Today&apos;s Spot Prices
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
              Loading live prices…
            </div>
          ) : error && !data ? (
            <div className="glass-panel px-6 py-14 text-center font-medium text-red-600" role="alert">
              {error}
            </div>
          ) : data ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                {SPOT_META.map((metal) => {
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
                <span
                  className="inline-flex h-2.5 w-2.5 animate-live rounded-full bg-emerald-500"
                  aria-hidden
                />
                <span className="font-extrabold text-emerald-700">Live</span>
                <span>· Last updated</span>
                <span className="font-bold text-ink-soft">
                  {new Date(data.updatedAt).toLocaleString()}
                </span>
                {error ? <span className="font-medium text-red-600"> · refresh delayed</span> : null}
              </p>
            </>
          ) : null}
        </section>

        {data ? (
          <div className="animate-fade-up grid gap-5 [animation-delay:200ms] lg:grid-cols-[1.15fr_0.85fr]">
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

        <footer className="animate-fade-up mt-14 border-t border-slate-300/60 pt-8 text-center [animation-delay:320ms]">
          <p className="text-sm text-ink-faint sm:text-base">
            © New York Gold Market. Prices subject to change. Final appraisal at the window.
          </p>
        </footer>
      </div>
    </div>
  )
}
