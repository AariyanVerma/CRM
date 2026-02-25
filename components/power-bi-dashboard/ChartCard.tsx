"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

const FULL_SCREEN_CHART_HEIGHT = 520

type ChartCardProps = {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  fullScreenContent: React.ReactNode
  className?: string
}

export function ChartCard({ title, icon, children, fullScreenContent, className }: ChartCardProps) {
  const [fullScreenOpen, setFullScreenOpen] = useState(false)
  const openFullScreen = () => setFullScreenOpen(true)

  return (
    <>
      <div className={cn("relative group h-full", className)}>
        {typeof children === "object" && children !== null && "type" in children && typeof (children as React.ReactElement).type !== "string"
          ? React.cloneElement(children as React.ReactElement<{ onTitleClick?: () => void }>, { onTitleClick: openFullScreen })
          : children}
        <button
          type="button"
          onClick={openFullScreen}
          className="absolute top-2 right-2 z-10 rounded-lg border bg-background/90 backdrop-blur-sm px-2 py-1.5 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground hover:bg-background transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`View ${title} in full screen`}
        >
          <Maximize2 className="h-3.5 w-3.5 inline-block mr-1 align-middle" />
          Full screen
        </button>
      </div>

      <Dialog open={fullScreenOpen} onOpenChange={setFullScreenOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-6 overflow-auto flex items-center justify-center">
            <div style={{ height: FULL_SCREEN_CHART_HEIGHT, width: "100%" }}>
              {fullScreenContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
