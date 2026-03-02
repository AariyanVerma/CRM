"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, Shield, Mail, Phone, MapPin } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"

interface UserMenuProps {
  email: string
  role: "ADMIN" | "STAFF"
  firstName?: string | null
  lastName?: string | null
  address?: string | null
  phoneNumber?: string | null
  profileImageUrl?: string | null
}

export function UserMenu({
  email,
  role,
  firstName,
  lastName,
  address,
  phoneNumber,
  profileImageUrl,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative rounded-full"
        aria-label="User menu"
      >
        {profileImageUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={profileImageUrl}
              alt={fullName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <User className="h-5 w-5" />
        )}
        <span className="sr-only">User menu</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
            <DialogDescription>Your account details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                  <Image
                    src={profileImageUrl}
                    alt={fullName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border flex-shrink-0">
                  {role === "ADMIN" ? (
                    <Shield className="h-10 w-10 text-red-600" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">{fullName}</p>
                <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="mt-1">
                  {role}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{email}</span>
              </div>
              {phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{phoneNumber}</span>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{address}</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t">
              <Link href="/profile">
                <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  Edit Profile Picture
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

