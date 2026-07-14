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
          <stop stopColor="#f0d78c" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#8b6914" />
        </linearGradient>
      </defs>
      <rect x="8" y="18" width="32" height="18" rx="3" fill={`url(#${id})`} />
      <path d="M12 18 L16 10 H32 L36 18 Z" fill="#e8c96a" />
      <rect x="14" y="24" width="20" height="3" rx="1.5" fill="#fff6d6" opacity="0.45" />
      <circle cx="24" cy="32" r="3.5" fill="#fff6d6" opacity="0.55" />
    </svg>
  )
}

function IconSilver({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4f6f8" />
          <stop offset="0.4" stopColor="#a8b4c2" />
          <stop offset="1" stopColor="#5c6775" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="15" fill={`url(#${id})`} />
      <circle cx="24" cy="24" r="10" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
      <path d="M24 14 V34 M14 24 H34" stroke="#ffffff" strokeWidth="1.5" opacity="0.35" />
    </svg>
  )
}

function IconPlatinum({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eef4fa" />
          <stop offset="0.4" stopColor="#9fb4c9" />
          <stop offset="1" stopColor="#4a5d73" />
        </linearGradient>
      </defs>
      <path
        d="M24 7 L38 16.5 V31.5 L24 41 L10 31.5 V16.5 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M24 14 L32 19 V29 L24 34 L16 29 V19 Z"
        stroke="#ffffff"
        strokeWidth="1.75"
        opacity="0.55"
      />
    </svg>
  )
}

function IconPhone({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 3.5 H6.2 C5.3 3.5 4.5 4.3 4.6 5.2 C5.1 10.9 9.1 15 14.8 15.4 C15.7 15.5 16.5 14.7 16.5 13.8 V11.5 C16.5 10.9 16.1 10.3 15.5 10.1 L13.6 9.5 C13 9.3 12.4 9.5 12 10 L11.1 11.1 C9.5 10.2 8.1 8.9 7.2 7.3 L8.3 6.3 C8.8 5.9 9 5.3 8.8 4.7 L8.2 2.9 C8 2.3 7.4 1.9 6.8 1.9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(1.5 2)"
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
    wash: "from-gold-wash via-white/40 to-transparent",
    chip: "border-gold/25 bg-gold-wash text-gold-deep",
    delay: "0ms",
  },
  {
    key: "silver" as const,
    label: "Silver",
    Icon: IconSilver,
    priceClass: "metal-text-silver",
    wash: "from-silver-wash via-white/40 to-transparent",
    chip: "border-silver/30 bg-silver-wash text-silver-deep",
    delay: "80ms",
  },
  {
    key: "platinum" as const,
    label: "Platinum",
    Icon: IconPlatinum,
    priceClass: "metal-text-platinum",
    wash: "from-platinum-wash via-white/40 to-transparent",
    chip: "border-platinum/30 bg-platinum-wash text-platinum-deep",
    delay: "160ms",
  },
]

function RateList({
  title,
  titleClass,
  Icon,
  rows,
  baseDelay = 0,
}: {
  title: string
  titleClass: string
  Icon: (props: { className?: string }) => ReactNode
  rows: { purity: string; dwt: number; gram: number }[]
  baseDelay?: number
}) {
  return (
    <section className="glass-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-white/80 shadow-glass-sm">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${titleClass}`}>{title}</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Buy rates
          </p>
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
            className="animate-fade-up group grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-3 py-3.5 shadow-glass-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:bg-white hover:shadow-glass-lg sm:px-4 sm:py-4"
            style={{ animationDelay: `${baseDelay + i * 55}ms` }}
          >
            <span className="text-lg font-bold text-ink-soft sm:text-xl">{row.purity}</span>
            <span className="num w-[5.5rem] text-right text-lg font-extrabold text-ink sm:w-[6.5rem] sm:text-xl">
              ${formatMoney(row.dwt)}
            </span>
            <span className="num w-[5.5rem] text-right text-lg font-extrabold text-ink sm:w-[6.5rem] sm:text-xl">
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
                className="h-16 w-auto max-w-[260px] object-contain sm:h-[5.25rem] sm:max-w-[300px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex h-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-wash px-6 text-2xl font-extrabold tracking-tight text-gold-deep sm:h-20 sm:text-3xl">
                NYGM
              </div>
            )}
          </div>

          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.34em] text-gold-deep">
            Fortuna Metals · Diamond District
          </p>
          <h1 className="metal-text-brand text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
            New York Gold Market
          </h1>
          <p className="metal-text-gold mt-3 text-xl font-bold sm:text-2xl">We Buy Gold</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-ink-muted sm:text-lg">
            Live buy prices, styled for the floor — updated throughout the day.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <a
              href={PHONE_HREF}
              className="group inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-gold-soft via-gold to-gold-deep px-9 text-lg font-bold tracking-wide text-white shadow-gold-glow transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-glass-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold active:scale-[0.99] sm:text-xl"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/30">
                <IconPhone className="h-4 w-4" />
              </span>
              {PHONE_DISPLAY}
            </a>
            <a
              href={MAPS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-md text-center text-base font-medium text-ink-muted transition duration-200 hover:text-ink-soft sm:text-lg"
            >
              33W 47th Street · Window #2 · New York, NY 10036
            </a>
          </div>
        </header>

        <section
          id="spot-prices"
          className="mb-10 sm:mb-12"
          aria-labelledby="spot-heading"
        >
          <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-3 px-1 [animation-delay:60ms]">
            <div>
              <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-ink-faint">
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
                className="rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-ink-soft shadow-glass-sm"
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
                      className="animate-fade-up group relative overflow-hidden rounded-[1.75rem] border border-white/95 bg-white/70 p-6 shadow-glass-md backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-glass-lg"
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
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] ${metal.chip}`}
                          >
                            <Icon className="h-4 w-4" />
                            {metal.label}
                          </span>
                          <Icon className="h-9 w-9 opacity-90 transition duration-300 group-hover:scale-110" />
                        </div>
                        <p
                          className={`num mt-6 text-4xl font-extrabold tracking-tight sm:text-[2.75rem] ${metal.priceClass}`}
                        >
                          ${formatMoney(data.spots[metal.key])}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-ink-faint">per troy oz</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-5 flex flex-wrap items-center gap-2 px-1 text-base text-ink-muted">
                <span
                  className="inline-flex h-2.5 w-2.5 animate-live rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                  aria-hidden
                />
                <span className="font-semibold text-emerald-700">Live</span>
                <span>· Last updated</span>
                <span className="font-semibold text-ink-soft">
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
              baseDelay={220}
            />
            <RateList
              title="Silver"
              titleClass="metal-text-silver"
              Icon={IconSilver}
              rows={data.silver}
              baseDelay={280}
            />
          </div>
        ) : null}

        <footer className="animate-fade-up mt-14 border-t border-black/[0.05] pt-8 text-center [animation-delay:320ms]">
          <p className="text-sm text-ink-faint sm:text-base">
            © New York Gold Market · Fortuna Metals. Prices subject to change. Final appraisal at
            the window.
          </p>
        </footer>
      </div>
    </div>
  )
}
