"use client"

import { useState, type ReactNode } from "react"
import { MAPS_HREF, PHONE_DISPLAY, PHONE_HREF } from "@/lib/brand"
import { IconPhone } from "@/components/icons"

export function SiteShell({
  subtitle,
  children,
  skipHref,
  skipLabel = "Skip to content",
}: {
  subtitle: string
  children: ReactNode
  skipHref?: string
  skipLabel?: string
}) {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-mesh">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-aurora absolute -left-16 top-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="animate-aurora absolute -right-10 top-32 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl [animation-delay:2s]" />
        <div className="animate-aurora absolute bottom-24 left-1/3 h-64 w-64 rounded-full bg-slate-400/15 blur-3xl [animation-delay:4s]" />
        <div className="animate-aurora absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-rose-300/10 blur-3xl [animation-delay:1s]" />
      </div>

      {skipHref ? (
        <a
          href={skipHref}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {skipLabel}
        </a>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="animate-fade-up mb-12 text-center sm:mb-14">
          <div className="mb-7 flex justify-center">
            <div className="inline-flex items-center justify-center rounded-[1.75rem] bg-[#141210] px-7 py-5 shadow-[0_18px_50px_rgba(20,18,16,0.35)] ring-1 ring-white/10 sm:rounded-[2rem] sm:px-9 sm:py-6">
              {!logoFailed ? (
                <img
                  src="/logo.png"
                  alt="New York Gold Market"
                  className="h-24 w-auto max-w-[280px] object-contain sm:h-28 sm:max-w-[320px]"
                  draggable={false}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="flex h-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-wash px-6 text-2xl font-extrabold tracking-tight text-gold-deep sm:h-20 sm:text-3xl">
                  NYGM
                </div>
              )}
            </div>
          </div>

          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.34em] text-amber-800">
            Diamond District · New York
          </p>
          <h1 className="metal-text-brand text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
            New York Gold Market
          </h1>
          <p className="metal-text-gold mt-3 text-xl font-extrabold sm:text-2xl">We Buy Gold</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-ink-muted sm:text-lg">{subtitle}</p>

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
              className="max-w-md text-center text-base font-bold text-red-600 transition duration-200 hover:text-red-700 sm:text-lg"
            >
              33W 47th Street · Window #2 · New York, NY 10036
            </a>
          </div>
        </header>

        {children}

        <footer className="animate-fade-up mt-14 border-t border-slate-300/60 pt-8 text-center [animation-delay:320ms]">
          <p className="text-sm text-ink-faint sm:text-base">
            © New York Gold Market. Prices subject to change. Final appraisal in store.
          </p>
        </footer>
      </div>
    </div>
  )
}
