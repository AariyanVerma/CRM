"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Lock, Edit } from "lucide-react"
import { EditCardDialog } from "@/components/edit-card-dialog"

type CardRecord = {
  id: string
  token: string
  scanSlug?: string | null
  status: string
  locked?: boolean
  lockedAt?: Date | null
  issuedAt: Date
  lastScannedAt: Date | null
}

export function CustomerCardsCard({
  customerId,
  cards,
  canIssueCard,
  isAdmin,
}: {
  customerId: string
  cards: CardRecord[]
  canIssueCard: boolean
  isAdmin: boolean
}) {
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null)

  const activeCard = cards.find((c) => c.status === "ACTIVE")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Cards</CardTitle>
        <CardDescription>
          Manage membership cards for this customer. When a card is locked, only this app and authorized users can scan it to see or edit data—no one else can use it anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cards.length === 0 ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-muted text-muted-foreground">No cards issued</Badge>
            <p className="text-sm text-muted-foreground">Issue a new card to get started.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {cards.map((card) => (
              <li
                key={card.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={card.status === "ACTIVE" ? "default" : "secondary"}
                    className={
                      card.status === "ACTIVE"
                        ? "bg-blue-600 hover:bg-blue-600/90"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {card.status}
                  </Badge>
                  {(card.locked === true) && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                      <Lock className="mr-1 h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setEditingCard(card)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
                <div className="grid gap-1 text-sm">
                  <p className="text-muted-foreground">
                    Token: <span className="font-mono text-xs break-all">{card.token}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Issued: {new Date(card.issuedAt).toLocaleDateString()}
                  </p>
                  {card.lastScannedAt && (
                    <p className="text-muted-foreground">
                      Last scanned: {new Date(card.lastScannedAt).toLocaleString()}
                    </p>
                  )}
                  {card.status === "ACTIVE" && (
                    <p className="text-muted-foreground">
                      NDEF URL:{" "}
                      <span className="font-mono text-xs break-all bg-muted p-1 rounded">
                        {process.env.NEXT_PUBLIC_APP_URL || ""}/scan/{card.scanSlug ?? card.token}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(isAdmin || canIssueCard) && (
          <div className="pt-2">
            <Button asChild>
              <Link href={`/cards/portal?customerId=${encodeURIComponent(customerId)}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Issue New Card
              </Link>
            </Button>
          </div>
        )}

        {editingCard && (
          <EditCardDialog
            card={{
              id: editingCard.id,
              token: editingCard.token,
              status: editingCard.status as "ACTIVE" | "LOST" | "DISABLED",
              locked: editingCard.locked === true,
              lockedAt: editingCard.lockedAt ? new Date(editingCard.lockedAt).toISOString() : null,
              issuedAt: new Date(editingCard.issuedAt).toISOString(),
              lastScannedAt: editingCard.lastScannedAt ? new Date(editingCard.lastScannedAt).toISOString() : null,
            }}
            open={!!editingCard}
            onOpenChange={(open) => !open && setEditingCard(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
