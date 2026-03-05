"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CreditCard } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        const isNfc = variant === "nfc"
        return (
          <Toast key={id} variant={variant} {...props}>
            {isNfc ? (
              <div className="relative flex flex-col w-full overflow-hidden rounded-2xl">
                <div className="nfc-toast-shimmer absolute inset-0 pointer-events-none" aria-hidden />
                <div className="relative flex items-center gap-3 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm nfc-toast-icon-pop">
                    <CreditCard className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {title && (
                      <ToastTitle className="text-[15px] font-semibold text-white">
                        {title}
                      </ToastTitle>
                    )}
                    {description && (
                      <ToastDescription className="text-sm text-white/90">
                        {description}
                      </ToastDescription>
                    )}
                  </div>
                  <ToastClose className="relative right-0 top-0 translate-y-0 opacity-80 hover:opacity-100 text-white transition-opacity" />
                </div>
                <div className="relative h-1 w-full overflow-hidden bg-black/20">
                  <div className="nfc-toast-progress h-full bg-white/90 rounded-r-full" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action}
                <ToastClose />
              </>
            )}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

