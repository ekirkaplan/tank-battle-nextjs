import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }
    
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscores and hyphens' },
        { status: 400 }
      )
    }
    
    await dbConnect()
    
    // Check if username exists
    const existingPlayer = await Player.findOne({ username: username.toLowerCase() })
    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      )
    }
    
    // Create new player
    const player = new Player({
      username: username.toLowerCase(),
      password
    })
    
    await player.save()
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: player._id.toString() },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    // Create response
    const response = NextResponse.json({
      success: true,
      token, // Send token in response body
      player: {
        username: player.username,
        stats: player.stats
      }
    })
    
    // Also set cookie
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })
    
    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}