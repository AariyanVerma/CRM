"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface Customer {
  id: string
  fullName: string
  phoneNumber: string
  address: string
  isBusiness: boolean
  businessName: string | null
  businessVerificationNotes: string | null
  identityVerificationNotes: string | null
  identityVerified: boolean
}

interface EditCustomerFormProps {
  customer: Customer
}

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isBusiness, setIsBusiness] = useState(customer.isBusiness)

  useEffect(() => {
    setIsBusiness(customer.isBusiness)
  }, [customer.isBusiness])

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
      identityVerified: formData.get("identityVerified") === "on",
    }

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to update customer")
      }

      toast({
        title: "Customer updated",
        description: "Customer record has been updated successfully.",
        variant: "success",
      })
      router.push(`/customers/${customer.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Customer</CardTitle>
        <CardDescription>
          Update customer information and verification details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" defaultValue={customer.fullName} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={customer.phoneNumber} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea id="address" name="address" defaultValue={customer.address} required rows={3} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBusiness"
              name="isBusiness"
              checked={isBusiness}
              onCheckedChange={(checked) => setIsBusiness(checked === true)}
              defaultChecked={customer.isBusiness}
            />
            <Label htmlFor="isBusiness" className="cursor-pointer">
              This is a business customer
            </Label>
          </div>

          {isBusiness && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input 
                  id="businessName" 
                  name="businessName" 
                  defaultValue={customer.businessName || ""} 
                  required={isBusiness} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessVerificationNotes">Business Verification Notes</Label>
                <Textarea
                  id="businessVerificationNotes"
                  name="businessVerificationNotes"
                  defaultValue={customer.businessVerificationNotes || ""}
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
              defaultValue={customer.identityVerificationNotes || ""}
              rows={3}
              placeholder="Enter identity verification details..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="identityVerified"
              name="identityVerified"
              defaultChecked={customer.identityVerified}
            />
            <Label htmlFor="identityVerified" className="cursor-pointer">
              Identity Verified
            </Label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Customer"}
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

