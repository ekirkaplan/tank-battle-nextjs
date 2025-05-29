import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET)

export async function signJWT(payload: any, expiresIn: string = '7d') {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 7 * 24 * 60 * 60 // 7 days

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(JWT_SECRET_BYTES)
}

export async function verifyJWT(token: string) {
  try {
    // For client/server compatibility, use jsonwebtoken library
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    try {
      // Fallback to jose
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES)
      return payload
    } catch {
      return null
    }
  }
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('authToken')
  
  if (!token) return null
  
  const payload = await verifyJWT(token.value)
  return payload
}

export function setAuthCookie(token: string) {
  cookies().set('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  })
}

export function removeAuthCookie() {
  cookies().delete('authToken')
}