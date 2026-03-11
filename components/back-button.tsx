"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
  replace?: boolean
}

export function BackButton({ href, label = "Back", className, replace }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      if (replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

