"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000
const PHONE_DISPLAY = "(917) 204-0009"
const PHONE_HREF = "tel:+19172040009"

function PriceTable({
  title,
  accent,
  rows,
}: {
  title: string
  accent: "gold" | "silver"
  rows: { purity: string; dwt: number; gram: number }[]
}) {
  return (
    <section className={`metal metal-${accent}`}>
      <div className="metal-title">
        <h2>{title}</h2>
        <span className="metal-rule" aria-hidden />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Purity</th>
              <th>DWT</th>
              <th>Gram</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.purity} style={{ animationDelay: `${0.05 * i}s` }}>
                <td className="purity">{row.purity}</td>
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
      <div className="atmosphere" aria-hidden>
        <div className="sheen" />
        <div className="grain" />
      </div>

      <main className="board">
        <header className="hero">
          <p className="brand">New York Gold Market</p>
          <p className="line">We buy gold</p>
          <p className="tagline">Live buy prices · Diamond District</p>
          <div className="contact">
            <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            <span>33W 47th Street · Window #2 · New York, NY 10036</span>
          </div>
        </header>

        <section className="spots" aria-label="Today's spot prices">
          <div className="section-label">
            <h2>Today&apos;s spot</h2>
            {data ? <time dateTime={data.date}>{formatBoardDate(data.date)}</time> : null}
          </div>

          {loading && !data ? (
            <p className="status">Loading prices…</p>
          ) : error && !data ? (
            <p className="status error">{error}</p>
          ) : data ? (
            <div className="spot-row">
              {(
                [
                  ["Gold", data.spots.gold],
                  ["Silver", data.spots.silver],
                  ["Platinum", data.spots.platinum],
                ] as const
              ).map(([label, value], i) => (
                <div
                  className="spot"
                  key={label}
                  style={{ animationDelay: `${0.08 + i * 0.07}s` }}
                >
                  <span className="spot-label">{label}</span>
                  <span className="spot-value">${formatMoney(value)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {data ? (
            <p className="updated">
              Updated {new Date(data.updatedAt).toLocaleString()}
              {error ? <span className="refresh-warn"> · refresh delayed</span> : null}
            </p>
          ) : null}
        </section>

        {data ? (
          <div className="metals">
            <PriceTable title="On Stone" accent="gold" rows={data.onStone} />
            <PriceTable title="Silver" accent="silver" rows={data.silver} />
          </div>
        ) : null}

        <footer className="foot">
          <p>Prices subject to change. Final appraisal at the window.</p>
        </footer>
      </main>
    </div>
  )
}
