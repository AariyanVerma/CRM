"use client"

import { useEffect, useRef, memo } from "react"

const WIDGET_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js"

const SYMBOLS = ["TVC:GOLD", "TVC:SILVER", "TVC:PLATINUM"] as const

// Four copies for seamless marquee loop (-25% animation)
const MARQUEE_SYMBOLS = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS, ...SYMBOLS]

function SingleQuoteWidget({
  symbol,
  containerRef,
}: {
  symbol: string
  containerRef: React.RefObject<HTMLDivElement>
}) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (container.querySelector("script")) return

    const script = document.createElement("script")
    script.src = `${WIDGET_SCRIPT}?symbol=${encodeURIComponent(symbol)}`
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      colorTheme: "dark",
      theme: "dark",
      isTransparent: true,
      locale: "en",
      width: "100%",
    })
    container.appendChild(script)
  }, [symbol, containerRef])

  return (
    <div
      className="tradingview-widget-container ticker-card-inner w-full rounded-lg overflow-hidden h-[86px] max-h-[86px] min-h-0"
      ref={containerRef}
      style={{ backgroundColor: "#000" }}
    >
      <div className="tradingview-widget-container__widget h-full overflow-hidden rounded-b-lg" />
    </div>
  )
}

const MemoizedWidget = memo(SingleQuoteWidget)

function TradingViewTickerTape() {
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ]

  // Preload the widget script so first cards can use cached script immediately
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "script"
    link.href = WIDGET_SCRIPT
    document.head.appendChild(link)
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }, [])

  return (
    <div id="tv-ticker-tape-root" className="w-full min-w-0 overflow-hidden pt-8 pb-8" style={{ isolation: "isolate", colorScheme: "light" }}>
      <div className="tv-ticker-marquee-track flex flex-nowrap w-max shrink-0 gap-6 items-center will-change-transform">
        {MARQUEE_SYMBOLS.map((symbol, i) => (
          <div
            key={`${symbol}-${i}`}
            className="ticker-card-glow shrink-0 rounded-lg overflow-visible flex items-stretch"
            style={{ minWidth: "260px" }}
          >
            <MemoizedWidget symbol={symbol} containerRef={refs[i]} />
          </div>
        ))}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes tv-ticker-marquee-scroll {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-25%, 0, 0); }
            }
            #tv-ticker-tape-root .tv-ticker-marquee-track {
              animation: tv-ticker-marquee-scroll 25s linear infinite !important;
              animation-iteration-count: infinite !important;
              will-change: transform;
              backface-visibility: hidden;
              transform: translateZ(0);
            }
            #tv-ticker-tape-root {
              color-scheme: light !important;
            }
            #tv-ticker-tape-root .ticker-card-glow {
              background-color: transparent !important;
              box-shadow: none !important;
              border: none !important;
              contain: layout;
            }
            #tv-ticker-tape-root .ticker-card-inner,
            .dark #tv-ticker-tape-root .ticker-card-inner {
              background-color: #000 !important;
            }
            #tv-ticker-tape-root .ticker-card-inner {
              box-shadow: 0 -8px 24px rgba(0,0,0,0.15), 0 -4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1);
            }
            .dark #tv-ticker-tape-root .ticker-card-inner {
              box-shadow: 0 -8px 24px rgba(255,255,255,0.15), 0 -4px 12px rgba(255,255,255,0.1), 0 8px 24px rgba(255,255,255,0.15), 0 4px 12px rgba(255,255,255,0.1);
            }
            .ticker-card-inner .tradingview-widget-container__widget,
            .ticker-card-inner .tradingview-widget-container__widget iframe {
              height: 100% !important;
              max-height: 100% !important;
              min-height: 0 !important;
            }
            #tv-ticker-tape-root .tradingview-widget-container__widget {
              filter: invert(1) hue-rotate(180deg) !important;
            }
          `,
        }}
      />
    </div>
  )
}

export { TradingViewTickerTape }
