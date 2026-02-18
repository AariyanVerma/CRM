"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface UserMenuProps {
  email: string
  role: "ADMIN" | "STAFF"
}

export function UserMenu({ email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="User menu"
      >
        <User className="h-5 w-5" />
        <span className="sr-only">User menu</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
            <DialogDescription>Your account details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {role === "ADMIN" ? (
                <Shield className="h-8 w-8 text-primary" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-lg">{email}</p>
                <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="mt-1">
                  {role}
                </Badge>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                You are logged in as {role === "ADMIN" ? "an administrator" : "a staff member"}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}






