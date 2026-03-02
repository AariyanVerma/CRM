import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(array)
  } else {

    const nodeCrypto = require('crypto')
    nodeCrypto.randomFillSync(array)
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function formatDecimal(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0.00'

  const truncated = Math.trunc(value * 100) / 100

  return truncated.toFixed(2)
}

export function getDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  email: string
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return name || user.email
}

export function getCustomerDisplayName(customer: {
  fullName: string
  isBusiness?: boolean
  businessName?: string | null
}): string {
  if (customer.isBusiness && customer.businessName?.trim()) {
    return customer.businessName.trim()
  }
  return customer.fullName
}

