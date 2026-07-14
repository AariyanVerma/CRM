"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"
const THEME_KEY = "nygm-theme"

type Theme = "light" | "dark"

function PriceTable({
  title,
  rows,
}: {
  title: string
  rows: { purity: string; dwt: number; gram: number }[]
}) {
  return (
    <section className="metal" aria-labelledby={`heading-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h2 id={`heading-${title.replace(/\s+/g, "-").toLowerCase()}`}>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Purity</th>
              <th scope="col">Per DWT</th>
              <th scope="col">Per Gram</th>
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

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "light" ? "dark" : "light"
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {theme === "light" ? "☾" : "☀"}
      </span>
      <span className="theme-toggle-text">{theme === "light" ? "Dark mode" : "Light mode"}</span>
    </button>
  )
}

export function PriceBoard() {
  const [data, setData] = useState<DailyPricesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme")
    if (current === "light" || current === "dark") {
      setTheme(current)
      return
    }
    const preferred = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark"
    document.documentElement.setAttribute("data-theme", preferred)
    setTheme(preferred)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light"
    document.documentElement.setAttribute("data-theme", next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
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

      <div className="topbar">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <main className="board">
        <header className="hero">
          <p className="brand">New York Gold Market</p>
          <h1 className="line">We Buy Gold</h1>
          <p className="tagline">Live buy prices · Diamond District</p>
          <div className="contact">
            <a className="phone" href={PHONE_HREF}>
              {PHONE_DISPLAY}
            </a>
            <p className="address">33W 47th Street · Window #2 · New York, NY 10036</p>
          </div>
        </header>

        <section className="spots" id="prices" aria-labelledby="spot-heading">
          <div className="section-label">
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
              {(
                [
                  ["Gold", data.spots.gold],
                  ["Silver", data.spots.silver],
                  ["Platinum", data.spots.platinum],
                ] as const
              ).map(([label, value]) => (
                <li className="spot" key={label}>
                  <span className="spot-label">{label}</span>
                  <span className="spot-value">${formatMoney(value)}</span>
                </li>
              ))}
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
            <PriceTable title="On Stone" rows={data.onStone} />
            <PriceTable title="Silver" rows={data.silver} />
          </div>
        ) : null}

        <footer className="foot">
          <p>Prices subject to change. Final appraisal at the window.</p>
        </footer>
      </main>
    </div>
  )
}
