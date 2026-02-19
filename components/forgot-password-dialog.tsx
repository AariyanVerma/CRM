"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"request" | "verify" | "success">("request")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState<string | null>(null)

  async function handleRequestOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "OTP Sent",
          description: data.message || "OTP has been sent to your email address",
          variant: "success",
        })
        setStep("verify")
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send OTP",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request OTP",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setVerifying(true)

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResetToken(data.resetToken)
        setStep("success")
        toast({
          title: "OTP Verified",
          description: "OTP verified successfully. Redirecting to password reset...",
          variant: "success",
        })
        setTimeout(() => {
          if (data.resetToken) {
            router.push(`/reset-password?token=${data.resetToken}`)
            onOpenChange(false)
          }
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: data.message || "Invalid OTP",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify OTP",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  function handleResetLinkClick() {
    if (resetToken) {
      router.push(`/reset-password?token=${resetToken}`)
      onOpenChange(false)
    }
  }

  function handleBack() {
    setStep("request")
    setOtp("")
    setResetToken(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "request" ? (
          <>
            <DialogHeader>
              <DialogTitle>Forgot Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you an OTP code to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </>
        ) : step === "verify" ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter OTP</DialogTitle>
              <DialogDescription>
                Enter the 6-digit OTP sent to your email address ({email})
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  disabled={verifying}
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Check your email for the 6-digit code. It expires in 10 minutes.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={verifying || otp.length !== 6} className="flex-1">
                  {verifying ? "Verifying..." : "Verify OTP"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={verifying}
                >
                  Back
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>OTP Verified</DialogTitle>
              <DialogDescription>
                Your OTP has been verified. Redirecting to password reset page...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button onClick={handleResetLinkClick} className="w-full">
                Go to Reset Password Page
              </Button>
              <Button
                variant="outline"
                onClick={handleBack}
                className="w-full"
              >
                Start Over
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

