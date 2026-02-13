import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, User } from "lucide-react"

interface User {
  id: string
  email: string
  role: "ADMIN" | "STAFF"
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
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {user.role === "ADMIN" ? (
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold text-lg">{user.email}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

