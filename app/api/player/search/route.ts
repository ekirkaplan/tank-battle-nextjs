import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// GET - Search players by username
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return NextResponse.json({ players: [] })
    }
    
    await dbConnect()
    
    // Search players by username (case insensitive)
    const players = await Player.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: userId } // Exclude current user
    })
    .select('_id username level.current stats.totalKills clan')
    .limit(10)
    .lean()
    
    // Filter out players who are already in clans for invite purposes
    const availablePlayers = players.filter(player => !player.clan?.id)
    
    return NextResponse.json({ 
      players: availablePlayers.map(player => ({
        _id: player._id,
        username: player.username,
        level: player.level.current,
        totalKills: player.stats.totalKills
      }))
    })
  } catch (error) {
    console.error('Search players error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}