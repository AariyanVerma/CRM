"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

export function NewCustomerForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isBusiness, setIsBusiness] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      fullName: formData.get("fullName") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      address: formData.get("address") as string,
      isBusiness: formData.get("isBusiness") === "on",
      businessName: formData.get("businessName") as string || null,
      businessVerificationNotes: formData.get("businessVerificationNotes") as string || null,
      identityVerificationNotes: formData.get("identityVerificationNotes") as string || null,
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to create customer")
      }

      const customer = await res.json()
      toast({
        title: "Customer created",
        description: "Customer record has been created successfully.",
      })
      router.push(`/customers/${customer.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Customer</CardTitle>
        <CardDescription>
          Enter customer information and verification details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input id="phoneNumber" name="phoneNumber" type="tel" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea id="address" name="address" required rows={3} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBusiness"
              name="isBusiness"
              checked={isBusiness}
              onCheckedChange={(checked) => setIsBusiness(checked === true)}
            />
            <Label htmlFor="isBusiness" className="cursor-pointer">
              This is a business customer
            </Label>
          </div>

          {isBusiness && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input id="businessName" name="businessName" required={isBusiness} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessVerificationNotes">Business Verification Notes</Label>
                <Textarea
                  id="businessVerificationNotes"
                  name="businessVerificationNotes"
                  rows={3}
                  placeholder="Enter business verification details..."
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="identityVerificationNotes">Identity Verification Notes</Label>
            <Textarea
              id="identityVerificationNotes"
              name="identityVerificationNotes"
              rows={3}
              placeholder="Enter identity verification details..."
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Customer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

