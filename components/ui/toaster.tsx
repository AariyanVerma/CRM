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
import { CreditCard, LogIn, Bell } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        const isNfc = variant === "nfc"
        const isNfcLogin = variant === "nfc-login"
        const isApproval = variant === "approval"
        return (
          <Toast key={id} variant={variant} {...props}>
            {isApproval ? (
              <div className="relative flex flex-col w-full overflow-hidden rounded-2xl">
                <div className="approval-toast-shimmer absolute inset-0 pointer-events-none" aria-hidden />
                <div className="relative flex items-center gap-4 px-5 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-2 ring-white/40 animate-in zoom-in-95 duration-300">
                    <Bell className="h-6 w-6 text-white drop-shadow-md" strokeWidth={2} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {title && <ToastTitle className="text-[15px] font-bold text-white drop-shadow-sm">{title}</ToastTitle>}
                    {description && <ToastDescription className="text-sm text-white/95">{description}</ToastDescription>}
                  </div>
                  <ToastClose className="relative right-0 top-0 translate-y-0 opacity-80 hover:opacity-100 text-white transition-opacity rounded-full p-1.5 hover:bg-white/20" />
                </div>
                <div className="relative h-1 w-full overflow-hidden bg-black/20">
                  <div className="approval-toast-progress h-full w-full bg-white/90 rounded-r-full" />
                </div>
              </div>
            ) : isNfcLogin ? (
              <div className="relative flex flex-col w-full overflow-hidden rounded-2xl">
                <div className="nfc-toast-shimmer absolute inset-0 pointer-events-none" aria-hidden />
                <div className="relative flex items-center gap-3 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm nfc-toast-icon-pop">
                    <LogIn className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {title && <ToastTitle className="text-[15px] font-semibold text-white">{title}</ToastTitle>}
                    {description && <ToastDescription className="text-sm text-white/90">{description}</ToastDescription>}
                  </div>
                  <ToastClose className="relative right-0 top-0 translate-y-0 opacity-80 hover:opacity-100 text-white transition-opacity" />
                </div>
                <div className="relative h-1 w-full overflow-hidden bg-black/20">
                  <div className="nfc-toast-progress h-full bg-white/90 rounded-r-full" />
                </div>
              </div>
            ) : isNfc ? (
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
                <div className="flex items-center gap-2 flex-1 min-w-0 max-w-full">
                  <div className="min-w-0 flex-1">
                    {title && <ToastTitle className="truncate">{title}</ToastTitle>}
                    {description && (
                      <ToastDescription className="break-words line-clamp-2 text-left">
                        {description}
                      </ToastDescription>
                    )}
                  </div>
                  {action}
                  <ToastClose />
                </div>
              </>
            )}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

