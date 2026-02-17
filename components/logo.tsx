"use client"

import Link from "next/link"
import { useState } from "react"

interface LogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

export function Logo({ className = "", showText = false, size = "lg" }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // Rectangular logo: more width, less height
  // Responsive sizes that adapt to screen size
  const sizeClasses = {
    sm: "h-6 w-20 sm:h-8 sm:w-24",    // Mobile: 24px×80px, Desktop: 32px×96px
    md: "h-8 w-28 sm:h-10 sm:w-32",   // Mobile: 32px×112px, Desktop: 40px×128px
    lg: "h-10 w-36 sm:h-12 sm:w-40 md:h-14 md:w-48",   // Mobile: 40px×144px, Tablet: 48px×160px, Desktop: 56px×192px
    xl: "h-12 w-44 sm:h-14 sm:w-52 md:h-16 md:w-56 lg:h-20 lg:w-72",   // Mobile: 48px×176px, Tablet: 56px×208px, Desktop: 64px×224px, Large: 80px×288px
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }

  // Width and height for rectangular logo
  const imageSizes = {
    sm: { width: 96, height: 32 },
    md: { width: 128, height: 40 },
    lg: { width: 160, height: 48 },
    xl: { width: 224, height: 64 },
  }

  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image - Place your logo.png in the public folder */}
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
            <span className={`text-primary font-bold ${textSizeClasses[size]}`}>NYGM</span>
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

