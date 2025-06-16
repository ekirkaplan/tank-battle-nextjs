import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Leave clan
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
    
    await dbConnect()
    
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    if (!player.clan?.id) {
      return NextResponse.json({ error: 'You are not in a clan' }, { status: 400 })
    }
    
    const clan = await Clan.findById(player.clan.id)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check if player is the leader
    if (player.clan.role === 'leader') {
      // If there are other members, transfer leadership
      if (clan.members.length > 1) {
        // Find the next highest ranking member
        const nextLeader = clan.members.find(m => 
          m.player.toString() !== userId && m.role === 'officer'
        ) || clan.members.find(m => 
          m.player.toString() !== userId
        )
        
        if (nextLeader) {
          await clan.changeMemberRole(nextLeader.player.toString(), 'leader')
          
          // Update new leader's player document
          const newLeaderPlayer = await Player.findById(nextLeader.player)
          if (newLeaderPlayer && newLeaderPlayer.clan) {
            newLeaderPlayer.clan.role = 'leader'
            await newLeaderPlayer.save()
          }
        }
      } else {
        // Delete clan if leader is the only member
        await Clan.deleteOne({ _id: clan._id })
        player.clan = undefined
        await player.save()
        return NextResponse.json({ success: true, clanDeleted: true })
      }
    }
    
    // Remove player from clan
    await clan.removeMember(userId)
    
    // Clear player's clan info
    player.clan = undefined
    await player.save()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave clan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}