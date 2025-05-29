import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if it's a protected route
  if (path.startsWith('/game')) {
    const token = request.cookies.get('authToken')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Check if user is logged in and trying to access auth page
  if (path === '/') {
    const token = request.cookies.get('authToken')?.value
    if (token) {
      const payload = await verifyJWT(token)
      if (payload) {
        return NextResponse.redirect(new URL('/game', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/game/:path*']
}