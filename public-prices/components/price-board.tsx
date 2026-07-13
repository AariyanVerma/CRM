"use client"

import { useCallback, useEffect, useState } from "react"
import type { DailyPricesPayload } from "@/lib/prices"
import { formatBoardDate, formatMoney } from "@/lib/prices"

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS) || 30000

function SpotCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="spot-card">
      <span className="spot-label">{label}</span>
      <span className="spot-value">${formatMoney(value)}</span>
    </div>
  )
}

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
    <section className={`panel panel-${accent}`}>
      <div className="panel-head">
        <h2>{title}</h2>
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
            {rows.map((row) => (
              <tr key={row.purity}>
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
      const json = await res.json().catch(() => ({})) as DailyPricesPayload & { message?: string }
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
    <div className="board">
      <header className="hero">
        <p className="brand">New York Gold Market</p>
        <h1>We Buy Gold</h1>
        <p className="tagline">Live buy prices · Updated throughout the day</p>
        <div className="contact">
          <a href="tel:+19172507774">(917) 250-7774</a>
          <span>33W 47th Street Window #2 · New York, NY 10036</span>
        </div>
      </header>

      <section className="spots">
        <div className="spots-head">
          <h2>Today&apos;s Spot Prices</h2>
          {data ? <time dateTime={data.date}>{formatBoardDate(data.date)}</time> : null}
        </div>
        {loading && !data ? (
          <p className="status">Loading prices…</p>
        ) : error && !data ? (
          <p className="status error">{error}</p>
        ) : data ? (
          <div className="spots-grid">
            <SpotCard label="Gold" value={data.spots.gold} />
            <SpotCard label="Silver" value={data.spots.silver} />
            <SpotCard label="Platinum" value={data.spots.platinum} />
          </div>
        ) : null}
        {data ? (
          <p className="updated">
            Last updated {new Date(data.updatedAt).toLocaleString()}
            {error ? <span className="refresh-warn"> · refresh delayed</span> : null}
          </p>
        ) : null}
      </section>

      {data ? (
        <div className="tables">
          <PriceTable title="On Stone" accent="gold" rows={data.onStone} />
          <PriceTable title="Silver" accent="silver" rows={data.silver} />
        </div>
      ) : null}

      <footer className="foot">
        <p>Prices subject to change without notice. Visit our store for the final appraisal.</p>
      </footer>
    </div>
  )
}
