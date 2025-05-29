import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    await dbConnect()
    
    const player = await Player.findById(session.userId as string)
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      authenticated: true,
      player: {
        username: player.username,
        stats: player.stats,
        tankColor: player.tankColor
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}