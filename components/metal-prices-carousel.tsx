"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel } from "@/components/carousel"
import { useSocketPrices } from "@/hooks/use-socket-prices"

interface MetalPricesCarouselProps {
  gold: number | null
  silver: number | null
  platinum: number | null
}

export function MetalPricesCarousel({ gold, silver, platinum }: MetalPricesCarouselProps) {
  const [prices, setPrices] = useState({ gold, silver, platinum })

  // Socket-based price updates (real-time push updates)
  useSocketPrices(
    useCallback((newPrices) => {
      setPrices({
        gold: newPrices.gold,
        silver: newPrices.silver,
        platinum: newPrices.platinum,
      })
    }, []),
    { enabled: true }
  )

  const metals = [
    {
      name: "Gold",
      price: prices.gold,
    },
    {
      name: "Silver",
      price: prices.silver,
    },
    {
      name: "Platinum",
      price: prices.platinum,
    },
  ]

  return (
    <div className="w-full h-full relative">
      <Carousel
        showArrows={false}
        showIndicators={false}
        autoPlay={true}
        autoPlayInterval={3000}
        className="w-full h-full"
      >
        {metals.map((metal, index) => {
          return (
            <div key={index} className="w-full flex-shrink-0 h-full flex items-center justify-center">
              <div className="w-full">
                <div className="text-center pb-2 mb-2">
                  <span className="text-lg font-bold">{metal.name}</span>
                </div>
                <div className="text-2xl font-bold text-center">
                  ${metal.price?.toFixed(2) || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Spot price per oz
                </p>
              </div>
            </div>
          )
        })}
      </Carousel>
    </div>
  )
}

