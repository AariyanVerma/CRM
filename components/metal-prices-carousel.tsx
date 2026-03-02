"use client"

import { useState, useCallback } from "react"
import { Carousel } from "@/components/carousel"
import { useSocketPrices } from "@/hooks/use-socket-prices"
import { formatDecimal } from "@/lib/utils"

interface MetalPricesCarouselProps {
  gold: number | null
  silver: number | null
  platinum: number | null
}

export function MetalPricesCarousel({ gold, silver, platinum }: MetalPricesCarouselProps) {
  const [prices, setPrices] = useState({ gold, silver, platinum })

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
      color: "text-yellow-600 dark:text-yellow-400",
      gradient: "from-yellow-500/20 to-yellow-400/10",
    },
    {
      name: "Silver",
      price: prices.silver,
      color: "text-gray-600 dark:text-gray-400",
      gradient: "from-gray-500/20 to-gray-400/10",
    },
    {
      name: "Platinum",
      price: prices.platinum,
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500/20 to-blue-400/10",
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
              <div className="w-full space-y-3">
                <div className="text-center">
                  <span className={`text-lg font-bold ${metal.color}`}>{metal.name}</span>
                </div>
                <div className={`text-3xl font-extrabold text-center ${metal.color} tracking-tight transform transition-transform hover:scale-105`}>
                  ${metal.price !== null && metal.price !== undefined ? formatDecimal(metal.price) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground text-center font-medium">
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

