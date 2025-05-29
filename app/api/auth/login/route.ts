import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }
    
    await dbConnect()
    
    // Find player
    const player = await Player.findOne({ username: username.toLowerCase() })
    
    if (!player) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }
    
    // Check password
    const isValidPassword = await player.comparePassword(password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }
    
    // Update last seen
    player.lastSeen = new Date()
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}