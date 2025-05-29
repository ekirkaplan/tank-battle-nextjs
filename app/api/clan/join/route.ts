import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Join a clan
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { clanId } = await request.json()
    if (!clanId) {
      return NextResponse.json({ error: 'Clan ID is required' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Check player
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    if (player.clan?.id) {
      return NextResponse.json({ error: 'You are already in a clan' }, { status: 400 })
    }
    
    // Find clan
    const clan = await Clan.findById(clanId)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check requirements
    if (player.level.current < clan.requirements.minLevel) {
      return NextResponse.json({ 
        error: `You need to be at least level ${clan.requirements.minLevel} to join this clan` 
      }, { status: 400 })
    }
    
    if (player.stats.totalKills < clan.requirements.minKills) {
      return NextResponse.json({ 
        error: `You need at least ${clan.requirements.minKills} kills to join this clan` 
      }, { status: 400 })
    }
    
    // Check if clan is full
    if (clan.members.length >= clan.maxMembers) {
      return NextResponse.json({ error: 'Clan is full' }, { status: 400 })
    }
    
    // Add player to clan
    await clan.addMember(userId, 'member')
    
    // Update player
    player.clan = {
      id: clan._id,
      name: clan.name,
      tag: clan.tag,
      role: 'member'
    }
    await player.save()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Join clan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}