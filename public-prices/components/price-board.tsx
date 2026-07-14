"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"
const THEME_KEY = "nygm-theme"

type Theme = "light" | "dark"

function applyTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next)
  document.documentElement.classList.toggle("dark", next === "dark")
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* ignore */
  }
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="theme-sun" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
      <span className="theme-moon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
        </svg>
      </span>
    </button>
  )
}

function PriceTable({
  title,
  metal,
  rows,
}: {
  title: string
  metal: "gold" | "silver"
  rows: { purity: string; dwt: number; gram: number }[]
}) {
  const headingId = `heading-${title.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <section className={`panel metal-${metal}`} aria-labelledby={headingId}>
      <div className="panel-head">
        <h2 id={headingId}>{title}</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Purity</th>
              <th scope="col">DWT</th>
              <th scope="col">Gram</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.purity}>
                <th scope="row" className="purity">
                  {row.purity}
                </th>
                <td className="price">${formatMoney(row.dwt)}</td>
                <td className="price">${formatMoney(row.gram)}</td>
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
  const [theme, setTheme] = useState<Theme>("light")
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme")
    if (current === "light" || current === "dark") {
      setTheme(current)
      return
    }
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    applyTheme(preferred)
    setTheme(preferred)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light"
    applyTheme(next)
    setTheme(next)
  }

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
    <div className="page">
      <a className="skip-link" href="#prices">
        Skip to prices
      </a>

      <header className="site-header">
        <div className="site-header-inner">
          <div className="header-brand">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt=""
                className="header-logo"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="header-fallback">NYGM</span>
            )}
            <span className="header-title">Daily Prices</span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="board">
        <section className="hero dark-panel">
          <div className="hero-logo-wrap">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="New York Gold Market"
                className="hero-logo"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="hero-fallback">NYGM</span>
            )}
          </div>
          <h1 className="brand">New York Gold Market</h1>
          <p className="line">We Buy Gold</p>
          <p className="tagline">Live buy prices · Diamond District</p>
          <div className="contact">
            <a className="phone" href={PHONE_HREF}>
              {PHONE_DISPLAY}
            </a>
            <p className="address">33W 47th Street · Window #2 · New York, NY 10036</p>
          </div>
        </section>

        <section className="panel spots" id="prices" aria-labelledby="spot-heading">
          <div className="panel-head spots-head">
            <h2 id="spot-heading">Today&apos;s Spot Prices</h2>
            {data ? <time dateTime={data.date}>{formatBoardDate(data.date)}</time> : null}
          </div>

          {loading && !data ? (
            <p className="status" role="status">
              Loading prices…
            </p>
          ) : error && !data ? (
            <p className="status error" role="alert">
              {error}
            </p>
          ) : data ? (
            <ul className="spot-row">
              <li className="spot spot-gold">
                <span className="spot-label">Gold</span>
                <span className="spot-value">${formatMoney(data.spots.gold)}</span>
              </li>
              <li className="spot spot-silver">
                <span className="spot-label">Silver</span>
                <span className="spot-value">${formatMoney(data.spots.silver)}</span>
              </li>
              <li className="spot spot-platinum">
                <span className="spot-label">Platinum</span>
                <span className="spot-value">${formatMoney(data.spots.platinum)}</span>
              </li>
            </ul>
          ) : null}

          {data ? (
            <p className="updated">
              Last updated {new Date(data.updatedAt).toLocaleString()}
              {error ? <span className="refresh-warn"> · refresh delayed</span> : null}
            </p>
          ) : null}
        </section>

        {data ? (
          <div className="metals">
            <PriceTable title="On Stone" metal="gold" rows={data.onStone} />
            <PriceTable title="Silver" metal="silver" rows={data.silver} />
          </div>
        ) : null}

        <footer className="foot">
          <p>© New York Gold Market. Prices subject to change. Final appraisal at the window.</p>
        </footer>
      </main>
    </div>
  )
}
