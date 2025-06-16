import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('authToken')?.value
    
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    // Parse request body
    const { attribute } = await request.json()
    
    if (!attribute) {
      return NextResponse.json({ error: 'Attribute is required' }, { status: 400 })
    }
    
    // Connect to database
    await dbConnect()
    
    // Find player
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Assign attribute point
    try {
      await player.assignAttributePoint(attribute)
      
      return NextResponse.json({
        success: true,
        attributes: player.attributes,
        level: player.level
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  } catch (error) {
    console.error('Attribute assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('authToken')?.value
    
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    // Connect to database
    await dbConnect()
    
    // Find player
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Log player stats for debugging
    console.log('Player level data:', {
      username: player.username,
      level: player.level,
      kills: player.stats.totalKills,
      totalXP: player.level.totalExperience
    })
    
    return NextResponse.json({
      attributes: player.attributes,
      level: player.level
    })
  } catch (error) {
    console.error('Get attributes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}