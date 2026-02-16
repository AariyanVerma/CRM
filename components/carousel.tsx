"use client"

import { useState, useEffect, useRef, ReactNode } from "react"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null)

  // Create infinite loop by duplicating items
  const items = [...children, ...children, ...children]
  const itemCount = children.length
  const startIndex = itemCount // Start in the middle set
  const [realIndex, setRealIndex] = useState(startIndex)
  
  // Calculate proper widths for infinite carousel
  // Each slide should take full viewport width
  // Container is 3x the number of items wide
  const containerWidthPercent = itemCount * 3 * 100
  const slideWidthPercent = 100 / (itemCount * 3)

  useEffect(() => {
    // Initialize to middle set
    if (containerRef.current) {
      containerRef.current.style.transition = "none"
      const translatePercent = startIndex * slideWidthPercent
      containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      setRealIndex(startIndex)
      setCurrentIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (autoPlay) {
      autoPlayTimer.current = setInterval(() => {
        goToNext()
      }, autoPlayInterval)
      return () => {
        if (autoPlayTimer.current) {
          clearInterval(autoPlayTimer.current)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, autoPlayInterval])

  const goToSlide = (index: number, smooth = true) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    
    // Normalize index for display
    const normalizedIndex = ((index % itemCount) + itemCount) % itemCount
    setCurrentIndex(normalizedIndex)
    
    // Calculate target real index
    let newRealIndex = realIndex
    
    // Determine direction and calculate new position
    const currentNormalized = ((realIndex - startIndex) % itemCount + itemCount) % itemCount
    let direction = 0
    
    if (normalizedIndex !== currentNormalized) {
      // Calculate shortest path
      const forward = (normalizedIndex - currentNormalized + itemCount) % itemCount
      const backward = (currentNormalized - normalizedIndex + itemCount) % itemCount
      direction = forward <= backward ? 1 : -1
    }
    
    if (direction > 0) {
      // Moving forward
      newRealIndex = realIndex + 1
    } else if (direction < 0) {
      // Moving backward
      newRealIndex = realIndex - 1
    }
    
    setRealIndex(newRealIndex)
    
    if (containerRef.current) {
      containerRef.current.style.transition = smooth ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "none"
      const translatePercent = newRealIndex * slideWidthPercent
      containerRef.current.style.transform = `translateX(-${translatePercent}%)`
    }

    // Reset position after transition for seamless infinite loop
    if (smooth) {
      setTimeout(() => {
        if (containerRef.current) {
          // Check if we need to reset for infinite loop
          const needsReset = newRealIndex >= itemCount * 2 || newRealIndex < itemCount
          
          if (needsReset) {
            // Instantly jump to equivalent position in middle set (no transition = invisible)
            containerRef.current.style.transition = "none"
            const resetIndex = startIndex + normalizedIndex
            setRealIndex(resetIndex)
            const translatePercent = resetIndex * slideWidthPercent
            containerRef.current.style.transform = `translateX(-${translatePercent}%)`
          }
        }
        setIsTransitioning(false)
      }, 500)
    } else {
      setIsTransitioning(false)
    }
  }

  const goToNext = () => {
    // Move to next slide by incrementing real index
    if (isTransitioning) return
    setIsTransitioning(true)
    const newRealIndex = realIndex + 1
    const normalizedIndex = ((newRealIndex - startIndex) % itemCount + itemCount) % itemCount
    
    setCurrentIndex(normalizedIndex)
    setRealIndex(newRealIndex)
    
    if (containerRef.current) {
      containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      const translatePercent = newRealIndex * slideWidthPercent
      containerRef.current.style.transform = `translateX(-${translatePercent}%)`
    }
    
    // Reset position seamlessly after transition
    setTimeout(() => {
      if (containerRef.current && newRealIndex >= itemCount * 2) {
        containerRef.current.style.transition = "none"
        const resetIndex = startIndex + normalizedIndex
        setRealIndex(resetIndex)
        const translatePercent = resetIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
      setIsTransitioning(false)
    }, 500)
  }

  const goToPrev = () => {
    // Move to previous slide by decrementing real index
    if (isTransitioning) return
    setIsTransitioning(true)
    const newRealIndex = realIndex - 1
    const normalizedIndex = ((newRealIndex - startIndex) % itemCount + itemCount) % itemCount
    
    setCurrentIndex(normalizedIndex)
    setRealIndex(newRealIndex)
    
    if (containerRef.current) {
      containerRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      const translatePercent = newRealIndex * slideWidthPercent
      containerRef.current.style.transform = `translateX(-${translatePercent}%)`
    }
    
    // Reset position seamlessly after transition
    setTimeout(() => {
      if (containerRef.current && newRealIndex < itemCount) {
        containerRef.current.style.transition = "none"
        const resetIndex = startIndex + normalizedIndex
        setRealIndex(resetIndex)
        const translatePercent = resetIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
      setIsTransitioning(false)
    }, 500)
  }

  // Touch handlers for swipe
  const touchStartY = useRef<number>(0)
  const isHorizontalSwipe = useRef<boolean>(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disableTouch) return
    if (nested) {
      e.stopPropagation() // Prevent event from bubbling to parent carousel
    }
    // Don't prevent default here - allow page to scroll if it's a vertical gesture
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontalSwipe.current = false
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current)
    }
    // Allow the event to bubble up for vertical scrolling
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disableTouch) return
    
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = Math.abs(currentX - touchStartX.current)
    const deltaY = Math.abs(currentY - touchStartY.current)
    
    // Determine if this is a horizontal swipe (only after some movement)
    if (!isHorizontalSwipe.current && (deltaX > 10 || deltaY > 10)) {
      isHorizontalSwipe.current = deltaX > deltaY && deltaX > 15
    }
    
    // Only prevent default and move carousel if it's clearly a horizontal swipe
    // Allow vertical scrolling if it's a vertical gesture
    if (isHorizontalSwipe.current && deltaX > 15) {
      e.preventDefault()
      if (nested) {
        e.stopPropagation() // Prevent event from bubbling to parent carousel
      }
      touchEndX.current = currentX
      
      // Show visual feedback during swipe
      if (containerRef.current) {
        const swipeDistance = touchStartX.current - currentX
        const baseTranslatePercent = realIndex * slideWidthPercent
        const containerWidth = containerRef.current.offsetWidth
        const offsetPercent = (swipeDistance / containerWidth) * containerWidthPercent
        containerRef.current.style.transition = "none"
        containerRef.current.style.transform = `translateX(calc(-${baseTranslatePercent}% + ${offsetPercent}px))`
      }
    } else if (deltaY > deltaX && deltaY > 15) {
      // This is a vertical scroll - don't interfere, let it bubble up to page
      isHorizontalSwipe.current = false
      // Don't prevent default or stop propagation - allow page scrolling
      return
    }
    // If neither condition is met, don't interfere with default behavior
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disableTouch) return
    if (nested) {
      e.stopPropagation() // Prevent event from bubbling to parent carousel
    }
    
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (isHorizontalSwipe.current && Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe left - next
        goToNext()
      } else {
        // Swipe right - previous
        goToPrev()
      }
    } else if (isHorizontalSwipe.current) {
      // Snap back
      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.3s ease-out"
        const translatePercent = realIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
    }

    isHorizontalSwipe.current = false

    if (autoPlay) {
      autoPlayTimer.current = setInterval(() => {
        goToNext()
      }, autoPlayInterval)
    }
  }

  // Mouse drag handlers
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragOffset = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    
    dragOffset.current = e.clientX - dragStartX.current
    if (containerRef.current) {
      const baseTranslatePercent = realIndex * slideWidthPercent
      const containerWidth = containerRef.current.offsetWidth
      const offsetPercent = (dragOffset.current / containerWidth) * containerWidthPercent
      containerRef.current.style.transition = "none"
      containerRef.current.style.transform = `translateX(calc(-${baseTranslatePercent}% + ${offsetPercent}px))`
    }
  }

  const handleMouseUp = () => {
    if (!isDragging.current) return
    
    isDragging.current = false
    const threshold = 0.3 // 30% of width
    
    if (Math.abs(dragOffset.current) > (containerRef.current?.offsetWidth || 0) * threshold) {
      if (dragOffset.current > 0) {
        goToPrev()
      } else {
        goToNext()
      }
    } else {
      // Snap back
      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.3s ease-out"
        const translatePercent = realIndex * slideWidthPercent
        containerRef.current.style.transform = `translateX(-${translatePercent}%)`
      }
    }
    
    dragOffset.current = 0
    
    if (autoPlay) {
      autoPlayTimer.current = setInterval(() => {
        goToNext()
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
        touchAction: "pan-y pinch-zoom", // Always allow vertical scrolling
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
          touchAction: "pan-y pan-x", // Allow both vertical and horizontal
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

      {/* Navigation Arrows */}
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

      {/* Indicators */}
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
                    // Calculate how many steps to move
                    const diff = (index - currentIndex + itemCount) % itemCount
                    const forward = diff <= itemCount / 2
                    
                    if (forward) {
                      // Move forward
                      for (let i = 0; i < diff; i++) {
                        setTimeout(() => goToNext(), i * 100)
                      }
                    } else {
                      // Move backward
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

