import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

export const SESSION_COOKIE_NAME = 'session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production'

export interface SessionUser {
  id: string
  email: string
  role: 'ADMIN' | 'STAFF'
  canIssueCard?: boolean
  canAccessLockedCards?: boolean
  firstName?: string | null
  lastName?: string | null
  address?: string | null
  phoneNumber?: string | null
  profileImageUrl?: string | null
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  
  if (!sessionCookie?.value) {
    return null
  }

  try {
    const userId = sessionCookie.value

    const users = await prisma.$queryRaw<Array<{
      id: string
      email: string
      role: string
      firstName: string | null
      lastName: string | null
      address: string | null
      phoneNumber: string | null
      profileImageUrl: string | null
      canIssueCard: boolean | null
      canAccessLockedCards: boolean | null
    }>>`
      SELECT id, email, role, "firstName", "lastName", address, "phoneNumber", "profileImageUrl", "canIssueCard", "canAccessLockedCards"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `
    const user = users[0]
    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      role: user.role as 'ADMIN' | 'STAFF',
      canIssueCard: user.canIssueCard === true,
      canAccessLockedCards: user.canAccessLockedCards === true,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
    } as SessionUser
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies()

  const isProduction = process.env.NODE_ENV === 'production'
  const useSecure = isProduction
  
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',

  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {

  const normalizedEmail = email.toLowerCase().trim()

  const users = await prisma.$queryRaw<Array<{
    id: string
    email: string
    passwordHash: string
    role: string
    firstName: string | null
    lastName: string | null
    address: string | null
    phoneNumber: string | null
    profileImageUrl: string | null
  }>>`
    SELECT id, email, "passwordHash", role, "firstName", "lastName", address, "phoneNumber", "profileImageUrl"
    FROM "User" 
    WHERE LOWER(email) = LOWER(${normalizedEmail}) 
    LIMIT 1
  `
  const user = users[0] || null

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
    role: user.role as 'ADMIN' | 'STAFF',
    firstName: user.firstName,
    lastName: user.lastName,
    address: user.address,
    phoneNumber: user.phoneNumber,
    profileImageUrl: user.profileImageUrl,
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  if (!sessionCookie?.value) return null
  try {
    const userId = sessionCookie.value
    const users = await prisma.$queryRaw<Array<{
      id: string
      email: string
      role: string
      firstName: string | null
      lastName: string | null
      address: string | null
      phoneNumber: string | null
      profileImageUrl: string | null
      canIssueCard: boolean | null
      canAccessLockedCards: boolean | null
    }>>`
      SELECT id, email, role, "firstName", "lastName", address, "phoneNumber", "profileImageUrl", "canIssueCard", "canAccessLockedCards"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `
    const user = users[0]
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      role: user.role as 'ADMIN' | 'STAFF',
      canIssueCard: user.canIssueCard === true,
      canAccessLockedCards: user.canAccessLockedCards === true,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
    } as SessionUser
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  return session
}

