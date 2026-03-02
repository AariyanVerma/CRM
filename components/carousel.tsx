"use client"

import { useState, useEffect, useRef, useCallback, ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CarouselProps {
  children: ReactNode[]
  className?: string
  showIndicators?: boolean
  showArrows?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  disableTouch?: boolean
  nested?: boolean
}

export function Carousel({
  children,
  className,
  showIndicators = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  disableTouch = false,
  nested = false,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const isTransitioningRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null)

  const itemCount = children.length

  const items = [...children, ...children, ...children]
  const startIndex = itemCount
  const [realIndex, setRealIndex] = useState(startIndex)

  const containerWidthPercent = itemCount * 3 * 100
  const slideWidthPercent = 100 / (itemCount * 3)

  useEffect(() => {

    if (containerRef.current) {
      containerRef.current.style.transition = "none"
      const translatePercent = startIndex * slideWidthPercent
      containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      setRealIndex(startIndex)
      setCurrentIndex(0)
    }

  }, [])

  const goToNext = useCallback(() => {
    if (isTransitioningRef.current) return
    setIsTransitioning(true)
    isTransitioningRef.current = true

    setRealIndex((prevRealIndex) => {
      const newRealIndex = prevRealIndex + 1
      const normalizedIndex = ((newRealIndex - startIndex) % itemCount + itemCount) % itemCount
      setCurrentIndex(normalizedIndex)

      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        const translatePercent = newRealIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }

      setTimeout(() => {
        if (containerRef.current && newRealIndex >= itemCount * 2) {
          containerRef.current.style.transition = "none"
          const resetIndex = startIndex + normalizedIndex
          setRealIndex(resetIndex)
          containerRef.current.style.transform = `translateX(-${resetIndex * slideWidthPercent}%)`
        }
        setIsTransitioning(false)
        isTransitioningRef.current = false
      }, 500)
      return newRealIndex
    })
  }, [itemCount, startIndex, slideWidthPercent])

  useEffect(() => {
    if (autoPlay) {

      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current)
        autoPlayTimer.current = null
      }

      const startAutoPlay = () => {
        if (autoPlayTimer.current) {
          clearInterval(autoPlayTimer.current)
        }
        autoPlayTimer.current = setInterval(() => {

          if (!isTransitioningRef.current) {
            goToNext()
          }
        }, autoPlayInterval)
      }

      const timeout = setTimeout(startAutoPlay, 100)
      
      return () => {
        if (autoPlayTimer.current) {
          clearInterval(autoPlayTimer.current)
          autoPlayTimer.current = null
        }
        clearTimeout(timeout)
      }
    } else {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current)
        autoPlayTimer.current = null
      }
    }
  }, [autoPlay, autoPlayInterval, goToNext])

  const goToSlide = (index: number, smooth = true) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const normalizedIndex = ((index % itemCount) + itemCount) % itemCount
    setCurrentIndex(normalizedIndex)
    const currentNormalized = ((realIndex - startIndex) % itemCount + itemCount) % itemCount
    const forward = (normalizedIndex - currentNormalized + itemCount) % itemCount
    const backward = (currentNormalized - normalizedIndex + itemCount) % itemCount
    const newRealIndex = realIndex + (forward <= backward ? 1 : -1)
    setRealIndex(newRealIndex)
    if (containerRef.current) {
      containerRef.current.style.transition = smooth ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "none"
      containerRef.current.style.transform = `translateX(-${newRealIndex * slideWidthPercent}%)`
    }
    if (!smooth) {
      setIsTransitioning(false)
      isTransitioningRef.current = false
    } else {
      setTimeout(() => {
        if (containerRef.current && (newRealIndex >= itemCount * 2 || newRealIndex < itemCount)) {
          containerRef.current.style.transition = "none"
          const resetIndex = startIndex + normalizedIndex
          setRealIndex(resetIndex)
          containerRef.current.style.transform = `translateX(-${resetIndex * slideWidthPercent}%)`
        }
        setIsTransitioning(false)
        isTransitioningRef.current = false
      }, 500)
    }
  }

  const goToPrev = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const newRealIndex = realIndex - 1
    const normalizedIndex = ((newRealIndex - startIndex) % itemCount + itemCount) % itemCount
    setCurrentIndex(normalizedIndex)
    setRealIndex(newRealIndex)
    if (containerRef.current) {
      containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      containerRef.current.style.transform = `translateX(-${newRealIndex * slideWidthPercent}%)`
    }
    setTimeout(() => {
      if (containerRef.current && newRealIndex < itemCount) {
        containerRef.current.style.transition = "none"
        const resetIndex = startIndex + normalizedIndex
        setRealIndex(resetIndex)
        containerRef.current.style.transform = `translateX(-${resetIndex * slideWidthPercent}%)`
      }
      setIsTransitioning(false)
      isTransitioningRef.current = false
    }, 500)
  }

  const touchStartY = useRef<number>(0)
  const isHorizontalSwipe = useRef<boolean>(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disableTouch) return
    if (nested) {
      e.stopPropagation()
    }

    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontalSwipe.current = false
    if (autoPlay && autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current)
      autoPlayTimer.current = null
    }

  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disableTouch) return
    
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = Math.abs(currentX - touchStartX.current)
    const deltaY = Math.abs(currentY - touchStartY.current)

    if (!isHorizontalSwipe.current && (deltaX > 10 || deltaY > 10)) {
      isHorizontalSwipe.current = deltaX > deltaY && deltaX > 15
    }

    if (isHorizontalSwipe.current && deltaX > 15) {
      e.preventDefault()
      if (nested) {
        e.stopPropagation()
      }
      touchEndX.current = currentX

      if (containerRef.current) {
        const swipeDistance = touchStartX.current - currentX
        const baseTranslatePercent = realIndex * slideWidthPercent
        const containerWidth = containerRef.current.offsetWidth
        const offsetPx = (swipeDistance / containerWidth) * containerWidthPercent
        containerRef.current.style.transition = "none"
        containerRef.current.style.transform = `translateX(calc(-${baseTranslatePercent}% + ${offsetPx}px))`
      }
    } else if (deltaY > deltaX && deltaY > 15) {

      isHorizontalSwipe.current = false

      return
    }

  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disableTouch) return
    if (nested) {
      e.stopPropagation()
    }
    
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (isHorizontalSwipe.current && Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {

        goToNext()
      } else {

        goToPrev()
      }
    } else if (isHorizontalSwipe.current) {

      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        const translatePercent = realIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
    }

    isHorizontalSwipe.current = false

    if (autoPlay && !autoPlayTimer.current) {
      autoPlayTimer.current = setInterval(() => {
        if (!isTransitioningRef.current) {
          goToNext()
        }
      }, autoPlayInterval)
    }
  }

  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragOffset = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    if (autoPlay && autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current)
      autoPlayTimer.current = null
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    
    dragOffset.current = e.clientX - dragStartX.current
    if (containerRef.current) {
      const baseTranslatePercent = realIndex * slideWidthPercent
      const containerWidth = containerRef.current.offsetWidth
      const offsetPx = (dragOffset.current / containerWidth) * containerWidthPercent
      containerRef.current.style.transition = "none"
      containerRef.current.style.transform = `translateX(calc(-${baseTranslatePercent}% + ${offsetPx}px))`
    }
  }

  const handleMouseUp = () => {
    if (!isDragging.current) return
    
    isDragging.current = false
    const threshold = 0.3
    
    if (Math.abs(dragOffset.current) > (containerRef.current?.offsetWidth || 0) * threshold) {
      if (dragOffset.current > 0) {
        goToPrev()
      } else {
        goToNext()
      }
    } else {

      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        const translatePercent = realIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
    }

    dragOffset.current = 0

    if (autoPlay && !autoPlayTimer.current) {
      autoPlayTimer.current = setInterval(() => {
        if (!isTransitioningRef.current) {
          goToNext()
        }
      }, autoPlayInterval)
    }
  }

  const handleMouseLeave = () => {
    if (isDragging.current) {
      handleMouseUp()
    }
  }

  return (
    <div 
      className={cn("relative w-full overflow-hidden", className)} 
      style={{ 
        touchAction: "pan-y pinch-zoom",
        position: "relative",
        zIndex: nested ? 10 : 0,
      }}
    >
      <div
        ref={containerRef}
        className="flex"
        style={{
          width: `${containerWidthPercent}%`,
          willChange: "transform",
          touchAction: "pan-y pan-x",
        }}
        onTouchStart={disableTouch ? undefined : handleTouchStart}
        onTouchMove={disableTouch ? undefined : handleTouchMove}
        onTouchEnd={disableTouch ? undefined : handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {items.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0"
            style={{ 
              width: `${slideWidthPercent}%`,
              minWidth: `${slideWidthPercent}%`,
            }}
          >
            <div className="w-full h-full">
              {child}
            </div>
          </div>
        ))}
      </div>

      {
}
      {showArrows && itemCount > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background rounded-full shadow-lg"
            onClick={goToPrev}
            disabled={isTransitioning}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background rounded-full shadow-lg"
            onClick={goToNext}
            disabled={isTransitioning}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {
}
      {showIndicators && itemCount > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {children.map((_, index) => {
            const isActive = index === currentIndex
            return (
              <button
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isActive
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/50 hover:bg-muted-foreground"
                )}
                onClick={() => {
                  if (index !== currentIndex) {

                    const diff = (index - currentIndex + itemCount) % itemCount
                    const forward = diff <= itemCount / 2
                    
                    if (forward) {

                      for (let i = 0; i < diff; i++) {
                        setTimeout(() => goToNext(), i * 100)
                      }
                    } else {

                      const backwardSteps = itemCount - diff
                      for (let i = 0; i < backwardSteps; i++) {
                        setTimeout(() => goToPrev(), i * 100)
                      }
                    }
                  }
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

