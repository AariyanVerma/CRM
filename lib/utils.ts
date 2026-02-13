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
    // Node.js environment
    const nodeCrypto = require('crypto')
    nodeCrypto.randomFillSync(array)
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

