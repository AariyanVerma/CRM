import { cookies } from 'next/headers'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

const SESSION_COOKIE_NAME = 'session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production'

export interface SessionUser {
  id: string
  email: string
  role: 'ADMIN' | 'STAFF'
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  
  if (!sessionCookie?.value) {
    return null
  }

  try {
    // In production, use proper session encryption/validation
    // For MVP, we'll store user ID in cookie (not secure, but works for MVP)
    const userId = sessionCookie.value
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    })

    return user as SessionUser | null
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return null
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  return session
}

