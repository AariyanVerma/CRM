"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Key } from "lucide-react"
import { PasswordInput } from "@/components/password-input"
import { getDisplayName } from "@/lib/utils"
import { toProfileImageSrc } from "@/lib/profile-image"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface EditUserFormProps {
  user: {
    id: string
    email: string
    role: "ADMIN" | "STAFF"
    canIssueCard?: boolean
    canAccessLockedCards?: boolean
    firstName?: string | null
    lastName?: string | null
    address?: string | null
    phoneNumber?: string | null
    profileImageUrl?: string | null
  }
}

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [role, setRole] = useState<"ADMIN" | "STAFF">(user.role)
  const [canIssueCard, setCanIssueCard] = useState<boolean>(user.canIssueCard ?? false)
  const [canAccessLockedCards, setCanAccessLockedCards] = useState<boolean>(user.canAccessLockedCards ?? false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(user.profileImageUrl || null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        })
        return
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    let profileImageUrl: string | null = user.profileImageUrl || null
    if (profileImage) {
      try {
        const imageFormData = new FormData()
        imageFormData.append("image", profileImage)
        const imageRes = await fetch("/api/admin/users/upload-image", {
          method: "POST",
          body: imageFormData,
        })
        if (!imageRes.ok) {
          throw new Error("Failed to upload image")
        }
        const imageData = await imageRes.json()
        profileImageUrl = imageData.url
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload profile image",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
    }

    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string || undefined,
      role,
      canIssueCard,
      canAccessLockedCards,
      firstName: formData.get("firstName") as string || null,
      lastName: formData.get("lastName") as string || null,
      address: formData.get("address") as string || null,
      phoneNumber: formData.get("phoneNumber") as string || null,
      profileImageUrl,
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to update user")
      }

      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
        variant: "success",
      })
      router.push("/admin/users")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to delete user")
      }

      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
        variant: "success",
      })
      router.push("/admin/users")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
      setDeleteLoading(false)
    }
  }

  async function handleResetPassword() {
    const newPassword = prompt(`Enter new password for ${getDisplayName(user)} (min 6 characters):`)
    if (!newPassword) return

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setResetPasswordLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to reset password")
      }

      toast({
        title: "Password Reset",
        description: `Password has been reset for ${getDisplayName(user)}`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setResetPasswordLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
          <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>
              Update user information and settings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={resetPasswordLoading || loading}
            >
              <Key className="h-4 w-4 mr-2" />
              {resetPasswordLoading ? "Resetting..." : "Reset Password"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleteLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account
                    and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profileImage">Profile Picture</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={imagePreview.startsWith("data:") ? imagePreview : (toProfileImageSrc(imagePreview) ?? imagePreview)}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <span className="text-muted-foreground text-sm">No image</span>
                </div>
              )}
              <Input
                id="profileImage"
                name="profileImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Max size: 5MB</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={user.firstName || ""}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={user.lastName || ""}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={user.phoneNumber || ""}
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={user.address || ""}
              autoComplete="street-address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "ADMIN" | "STAFF")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="canIssueCard"
              checked={canIssueCard}
              onCheckedChange={(checked) => setCanIssueCard(checked === true)}
            />
            <Label htmlFor="canIssueCard" className="font-normal cursor-pointer">
              Can issue NFC cards (show &quot;Issue New Card&quot; on customer detail)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="canAccessLockedCards"
              checked={canAccessLockedCards}
              onCheckedChange={(checked) => setCanAccessLockedCards(checked === true)}
            />
            <Label htmlFor="canAccessLockedCards" className="font-normal cursor-pointer">
              Can access locked cards (scan and use transactions for locked cards)
            </Label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update User"}
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

