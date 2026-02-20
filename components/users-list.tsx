import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, User, Mail, Phone, MapPin, Edit } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface User {
  id: string
  email: string
  role: "ADMIN" | "STAFF"
  firstName?: string | null
  lastName?: string | null
  address?: string | null
  phoneNumber?: string | null
  profileImageUrl?: string | null
  createdAt: Date
}

export function UsersList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No users found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
        return (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {user.profileImageUrl ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                      <Image
                        src={user.profileImageUrl}
                        alt={fullName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border flex-shrink-0">
                      {user.role === "ADMIN" ? (
                        <Shield className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{fullName}</h3>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="flex-shrink-0">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                      {user.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{user.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                  <Link href={`/admin/users/${user.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}



