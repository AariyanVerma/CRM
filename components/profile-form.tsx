"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { User, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProfileFormProps {
  user: {
    id: string
    email: string
    role: "ADMIN" | "STAFF"
    firstName?: string | null
    lastName?: string | null
    address?: string | null
    phoneNumber?: string | null
    profileImageUrl?: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
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

    // Upload image first if provided
    let profileImageUrl: string | null = user.profileImageUrl || null
    if (profileImage) {
      try {
        const imageFormData = new FormData()
        imageFormData.append("image", profileImage)
        const imageRes = await fetch("/api/profile/upload-image", {
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

    // Update profile picture
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageUrl }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to update profile")
      }

      toast({
        title: "Profile updated",
        description: "Your profile picture has been updated successfully.",
        variant: "success",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>
          Update your profile picture. Only profile picture can be changed here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Profile Info */}
          <div className="flex items-center gap-4 pb-4 border-b">
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                <Image
                  src={imagePreview}
                  alt={fullName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border flex-shrink-0">
                {user.role === "ADMIN" ? (
                  <Shield className="h-10 w-10 text-primary" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{fullName}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="mt-1">
                {user.role}
              </Badge>
            </div>
          </div>

          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <label htmlFor="profileImage" className="text-sm font-medium">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                  <Image
                    src={imagePreview}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <span className="text-muted-foreground text-sm">No image</span>
                </div>
              )}
              <input
                id="profileImage"
                name="profileImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <p className="text-xs text-muted-foreground">Max size: 5MB</p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !profileImage} className="flex-1">
              {loading ? "Updating..." : "Update Profile Picture"}
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

