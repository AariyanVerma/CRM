import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import "./globals.css"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
})

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Daily Prices | New York Gold Market",
  description: "Live gold, silver, and platinum buy prices from New York Gold Market.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
