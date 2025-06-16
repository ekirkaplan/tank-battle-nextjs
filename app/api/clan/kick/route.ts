import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Kick a player from clan
export async function POST(request: NextRequest) {
  try {
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
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { playerId } = await request.json()
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Get current user's player data
    const currentPlayer = await Player.findById(userId)
    if (!currentPlayer || !currentPlayer.clan?.id) {
      return NextResponse.json({ error: 'You are not in a clan' }, { status: 400 })
    }
    
    // Get the clan
    const clan = await Clan.findById(currentPlayer.clan.id)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check if current user has permission to kick (leader or officer)
    const currentMember = clan.members.find(m => m.player.toString() === userId)
    if (!currentMember || !['leader', 'officer'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'You do not have permission to kick players' }, { status: 403 })
    }
    
    // Find the player to kick
    const targetMember = clan.members.find(m => m.player.toString() === playerId)
    if (!targetMember) {
      return NextResponse.json({ error: 'Player is not a member of this clan' }, { status: 400 })
    }
    
    // Cannot kick yourself
    if (playerId === userId) {
      return NextResponse.json({ error: 'You cannot kick yourself. Use leave clan instead.' }, { status: 400 })
    }
    
    // Cannot kick the leader
    if (targetMember.role === 'leader') {
      return NextResponse.json({ error: 'Cannot kick the clan leader' }, { status: 400 })
    }
    
    // Officers can only kick members, not other officers
    if (currentMember.role === 'officer' && targetMember.role === 'officer') {
      return NextResponse.json({ error: 'Officers cannot kick other officers' }, { status: 403 })
    }
    
    // Get the target player to update their clan info
    const targetPlayer = await Player.findById(playerId)
    if (!targetPlayer) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 })
    }
    
    // Remove player from clan
    clan.members = clan.members.filter(m => m.player.toString() !== playerId)
    await clan.save()
    
    // Update target player's clan info
    targetPlayer.clan = null
    await targetPlayer.save()
    
    return NextResponse.json({ 
      success: true,
      message: `${targetPlayer.username} has been kicked from the clan`
    })
  } catch (error) {
    console.error('Kick player error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}