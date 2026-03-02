"use client"

import Link from "next/link"
import { useState } from "react"

interface LogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  href?: string
}

export function Logo({ className = "", showText = false, size = "lg", href = "/" }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: "h-6 w-20 sm:h-8 sm:w-24",
    md: "h-8 w-28 sm:h-10 sm:w-32",
    lg: "h-10 w-36 sm:h-12 sm:w-40 md:h-14 md:w-48",
    xl: "h-12 w-44 sm:h-14 sm:w-52 md:h-16 md:w-56 lg:h-20 lg:w-72",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }

  const imageSizes = {
    sm: { width: 96, height: 32 },
    md: { width: 128, height: 40 },
    lg: { width: 160, height: 48 },
    xl: { width: 224, height: 64 },
  }

  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      {
}
      <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
        {!imageError ? (
          <img
            src="/logo.png"
            alt="New York Gold Market"
            className="object-contain w-full h-full"
            onError={() => {
              setImageError(true)
            }}
            style={{ 
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div className={`${sizeClasses[size]} bg-primary/20 border-2 border-primary/30 rounded flex items-center justify-center w-full h-full`}>
            <span className={`text-red-600 font-bold ${textSizeClasses[size]}`}>NYGM</span>
          </div>
        )}
      </div>
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} text-foreground`}>
          New York Gold Market
        </span>
      )}
    </Link>
  )
}

