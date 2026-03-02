"use client"

import { useEffect, useRef, memo } from "react"

const WIDGET_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js"

const SYMBOLS = [
  { symbol: "TVC:GOLD", label: "Gold", href: "https://www.tradingview.com/symbols/GOLD/?exchange=TVC" },
  { symbol: "TVC:SILVER", label: "Silver", href: "https://www.tradingview.com/symbols/SILVER/?exchange=TVC" },
  { symbol: "TVC:PLATINUM", label: "Platinum", href: "https://www.tradingview.com/symbols/PLATINUM/?exchange=TVC" },
] as const

function SingleQuoteWidget({
  symbol,
  label,
  href,
  containerRef,
}: {
  symbol: string
  label: string
  href: string
  containerRef: React.RefObject<HTMLDivElement>
}) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (container.querySelector("script")) return

    const script = document.createElement("script")
    script.src = WIDGET_SCRIPT
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      width: "100%",
    })
    container.appendChild(script)
  }, [symbol, containerRef])

  return (
    <div
      className="tradingview-widget-container flex flex-col rounded-lg overflow-hidden w-full h-[88px]"
      ref={containerRef}
      style={{ backgroundColor: "#000" }}
    >
      <div className="tradingview-widget-container__widget flex-1 min-h-0 overflow-hidden" />
      <div className="tradingview-widget-copyright text-center py-0.5 px-2 shrink-0 text-[10px] leading-tight">
        <a href={href} rel="noopener nofollow" target="_blank" className="text-muted-foreground hover:underline">
          <span className="text-blue-500">{label} quote</span>
        </a>
        <span className="text-muted-foreground"> by TradingView</span>
      </div>
    </div>
  )
}

const MemoizedWidget = memo(SingleQuoteWidget)

function HomeMetalTickersInner() {
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ]

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .home-metal-tickers .tradingview-widget-container,
            .home-metal-tickers .tradingview-widget-container__widget,
            .home-metal-tickers iframe {
              background-color: #000 !important;
            }
            .home-metal-tickers .tradingview-widget-container__widget iframe {
              min-height: 0 !important;
              height: 100% !important;
            }
          `,
        }}
      />
      <div className="home-metal-tickers grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {SYMBOLS.map(({ symbol, label, href }, i) => (
        <div key={symbol} className="rounded-lg overflow-hidden bg-black h-[88px]">
          <MemoizedWidget
            symbol={symbol}
            label={label}
            href={href}
            containerRef={refs[i]}
          />
        </div>
      ))}
      </div>
    </>
  )
}

export function HomeMetalTickers() {
  return <HomeMetalTickersInner />
}
