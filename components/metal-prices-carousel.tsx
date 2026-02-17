"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel } from "@/components/carousel"

interface MetalPricesCarouselProps {
  gold: number | null
  silver: number | null
  platinum: number | null
}

export function MetalPricesCarousel({ gold, silver, platinum }: MetalPricesCarouselProps) {
  const metals = [
    {
      name: "Gold",
      price: gold,
    },
    {
      name: "Silver",
      price: silver,
    },
    {
      name: "Platinum",
      price: platinum,
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

