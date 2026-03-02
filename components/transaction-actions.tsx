"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { MoreVertical, Edit, Trash2, Move, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getCustomerDisplayName } from "@/lib/utils"

interface Transaction {
  id: string
  type: "SCRAP" | "MELT"
  status: "OPEN" | "PRINTED" | "VOID"
  createdAt: Date
  lineItems: Array<{ id: string }>
}

interface TransactionActionsProps {
  transaction: Transaction
  customerId: string
  userRole: "ADMIN" | "STAFF"
  onUpdate?: () => void
}

export function TransactionActions({
  transaction,
  customerId,
  userRole,
  onUpdate,
}: TransactionActionsProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newStatus, setNewStatus] = useState<"OPEN" | "PRINTED" | "VOID">(transaction.status)
  const [newCustomerId, setNewCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")

  const isAdmin = userRole === "ADMIN"

  if (!isAdmin) {

    return (
      <Link href={`/print/${transaction.id}`}>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </Link>
    )
  }

  const handleEdit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to update transaction")
      }

      toast({
        title: "Transaction updated",
        description: "Transaction status has been updated successfully.",
        variant: "success",
      })
      setEditOpen(false)
      onUpdate?.()
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to delete transaction")
      }

      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully.",
        variant: "success",
      })
      setDeleteOpen(false)
      onUpdate?.()
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMove = async () => {
    if (!newCustomerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: newCustomerId }),
        credentials: "include",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to move transaction")
      }

      toast({
        title: "Transaction moved",
        description: "Transaction has been moved to the selected customer.",
        variant: "success",
      })
      setMoveOpen(false)
      onUpdate?.()
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Link href={`/print/${transaction.id}`}>
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Status
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMoveOpen(true)}>
            <Move className="h-4 w-4 mr-2" />
            Move to Customer
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {
}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction Status</DialogTitle>
            <DialogDescription>
              Update the status of this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as "OPEN" | "PRINTED" | "VOID")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="PRINTED">PRINTED</SelectItem>
                  <SelectItem value="VOID">VOID</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {
}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction
              and all its line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {
}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Transaction</DialogTitle>
            <DialogDescription>
              Move this transaction to a different customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Select Customer</Label>
              <CustomerSelect
                value={newCustomerId}
                onValueChange={setNewCustomerId}
                search={customerSearch}
                onSearchChange={setCustomerSearch}
                excludeCustomerId={customerId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={loading || !newCustomerId}>
              {loading ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CustomerSelect({
  value,
  onValueChange,
  search,
  onSearchChange,
  excludeCustomerId,
}: {
  value: string
  onValueChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
  excludeCustomerId: string
}) {
  const [customers, setCustomers] = useState<Array<{ id: string; fullName: string; isBusiness?: boolean; businessName?: string | null }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setCustomers(
            data.filter((c: { id: string }) => c.id !== excludeCustomerId)
          )
        }
      } catch (error) {
        console.error("Error fetching customers:", error)
      } finally {
        setLoading(false)
      }
    }

    const timeout = setTimeout(() => {
      if (search.length >= 2) {
        fetchCustomers()
      } else {
        setCustomers([])
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, excludeCustomerId])

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search customers by name or phone..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && customers.length > 0 && (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {getCustomerDisplayName(customer)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!loading && search.length >= 2 && customers.length === 0 && (
        <p className="text-sm text-muted-foreground">No customers found</p>
      )}
    </div>
  )
}

