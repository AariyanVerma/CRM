"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function ManualScanForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const token = formData.get("token") as string

    if (!token) {
      toast({
        title: "Error",
        description: "Please enter a token",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    router.push(`/scan/${token}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Card Token</CardTitle>
        <CardDescription>
          Manually enter the NFC card token to start a transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Card Token</Label>
            <Input
              id="token"
              name="token"
              required
              placeholder="Enter 64-character token"
              className="font-mono"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Loading..." : "Start Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

